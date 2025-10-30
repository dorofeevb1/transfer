import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import * as JSZip from 'jszip';

@Injectable({
    providedIn: 'root'
})
export class ExcelProcessingService {

    private readonly IMAGE_FIELD_NAME = '__images';

    constructor() { }

    public async processFiles(files: File[]): Promise<{ mergedData: any[], sourceData: { fileName: string, data: any[] }[] }> {
        const sourceData: { fileName: string, data: any[] }[] = [];
        for (const file of files) {
            try {
                const data = await this.readFile(file);
                sourceData.push({ fileName: file.name, data });
            } catch (error) {
                console.error(`[FATAL] Ошибка при обработке файла ${file.name}:`, error);
            }
        }
        const mergedData = sourceData.flatMap(source => source.data);
        console.log('[FINAL] Итоговые объединенные данные:', mergedData);
        return { mergedData, sourceData };
    }

    private readFile(file: File): Promise<any[]> {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension === 'xlsx') {
            return this.parseXlsxHybrid(file);
        } else {
            return Promise.reject(new Error(`Формат .${fileExtension} не поддерживается для этого парсера.`));
        }
    }

    private async parseXlsxHybrid(file: File): Promise<any[]> {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        let data: any[] = []; // Используем let, так как будем переопределять массив
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                raw: false,
                defval: null,
                blankrows: true
            });
            data.push(...jsonData);
        });
        const zip = await JSZip.loadAsync(arrayBuffer);
        const relsFileNames = Object.keys(zip.files).filter(name => /xl\/drawings\/_rels\/drawing\d+\.xml\.rels/.test(name));
        if (relsFileNames.length === 0) {
            console.warn('[ПРЕДУПРЕЖДЕНИЕ] Файлы связей (.rels) не найдены. Картинки не могут быть сопоставлены.');
            return data; // Возвращаем данные как есть, если картинок нет
        }

        const imageRels = new Map<string, string>();
        for (const relsFileName of relsFileNames) {
            const relsXml = await zip.file(relsFileName)!.async('string');
            const parser = new DOMParser();
            const relsDoc = parser.parseFromString(relsXml, 'application/xml');
            const relationships = Array.from(relsDoc.getElementsByTagName('Relationship'));
            relationships.forEach(rel => {
                const rId = rel.getAttribute('Id');
                const target = rel.getAttribute('Target');
                if (rId && target && target.startsWith('../media/')) {
                    const imagePath = 'xl' + target.substring(2);
                    imageRels.set(rId, imagePath);
                }
            });
        }
        if (imageRels.size === 0) {
            console.warn('[ПРЕДУПРЕЖДЕНИЕ] В файлах связей не найдено ни одной ссылки на изображения.');
            return data;
        }

        const drawingFileNames = Object.keys(zip.files).filter(name => /xl\/drawings\/drawing\d+\.xml/.test(name));

        for (const drawingFileName of drawingFileNames) {
            const drawingXml = await zip.file(drawingFileName)!.async('string');
            const parser = new DOMParser();
            const drawingDoc = parser.parseFromString(drawingXml, 'application/xml');
            const anchors = Array.from(drawingDoc.getElementsByTagNameNS('*', 'twoCellAnchor'));
            console.log(`В файле ${drawingFileName} найдено ${anchors.length} "якорей" изображений.`);

            for (const anchor of anchors) {
                const rIdEl = anchor.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'blip')[0];
                const rId = rIdEl?.getAttribute('r:embed');
                if (!rId) continue;

                const rowEl = anchor.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing', 'row')[0];
                const row = rowEl ? parseInt(rowEl.textContent || '-1', 10) : -1;
                if (row === -1) continue;
                const imagePath = imageRels.get(rId);
                if (!imagePath) {
                    console.warn(`[ПРЕДУПРЕЖДЕНИЕ] Для rId=${rId} не найдена связь в .rels файлах.`);
                    continue;
                }

                const imageFile = zip.file(imagePath);
                if (imageFile) {
                    const base64 = await imageFile.async('base64');
                    const extension = imagePath.split('.').pop()?.toLowerCase() || 'png';
                    const imageSrc = `data:image/${extension};base64,${base64}`;
                    const targetIndex = row - 1; // Компенсируем заголовок Excel (он не попадает в JSON)

                    if (data[targetIndex]) {
                        if (!data[targetIndex][this.IMAGE_FIELD_NAME]) {
                            data[targetIndex][this.IMAGE_FIELD_NAME] = [];
                        }
                        data[targetIndex][this.IMAGE_FIELD_NAME].push(imageSrc);
                    } else {
                        console.error(`[КРИТИЧЕСКАЯ ОШИБКА] Попытка добавить картинку в несуществующую строку данных с индексом ${targetIndex}.`);
                    }
                }
            }
        }
        if (data.length > 0) {
            const firstRow = data[0];
            const imagePlaceholderKeys = Object.keys(firstRow).filter(key => {
                const lowerKey = key.toLowerCase();
                const imageKeywords = ['image', 'img', 'photo', 'picture', 'изображение', 'фото', 'картинка', 'Фотографии', 'фотки'];
                return imageKeywords.some(keyword => lowerKey.includes(keyword)) && key !== this.IMAGE_FIELD_NAME;
            });
            if (imagePlaceholderKeys.length > 0) {
                console.log('Найдены и будут удалены следующие пустые колонки:', imagePlaceholderKeys);
                data = data.map(row => {
                    const newRow = { ...row };
                    for (const key of imagePlaceholderKeys) {
                        delete newRow[key];
                    }
                    return newRow;
                });
                console.log('Очистка завершена. Пример первой строки ПОСЛЕ очистки:', data[0]);
            } else {
                console.log('Пустых колонок из-под изображений не найдено, очистка не требуется.');
            }
        }
        return data;
    }
}
