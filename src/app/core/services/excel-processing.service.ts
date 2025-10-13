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
        const sourceData: { fileName:string, data: any[] }[] = [];
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

    /**
     * СВЕРХОТЛАДОЧНАЯ ВЕРСИЯ. Показывает картинки прямо в консоли.
     */
    private async parseXlsxHybrid(file: File): Promise<any[]> {
        console.log('%c[ШАГ 1: ЧТЕНИЕ ФАЙЛА]', 'color: blue; font-weight: bold;');
        const arrayBuffer = await file.arrayBuffer();
        console.log(`Файл ${file.name} успешно прочитан в ArrayBuffer, размер: ${arrayBuffer.byteLength} байт.`);

        console.log('%c[ШАГ 2: ПАРСИНГ ТЕКСТА]', 'color: blue; font-weight: bold;');
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const data: any[] = [];
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                raw: false,
                defval: null, // Пустые ячейки будут null
                blankrows: true // СОХРАНЯЕМ ПУСТЫЕ СТРОКИ - ЭТО ВАЖНО!
            });
            data.push(...jsonData);
        });
        console.log(`Найдено ${data.length} строк данных (включая пустые). Пример первой строки:`, data[0]);

        console.log('%c[ШАГ 3: ПОИСК СВЯЗЕЙ ИЗОБРАЖЕНИЙ]', 'color: blue; font-weight: bold;');
        const zip = await JSZip.loadAsync(arrayBuffer);
        const relsFileNames = Object.keys(zip.files).filter(name => /xl\/drawings\/_rels\/drawing\d+\.xml\.rels/.test(name));
        if (relsFileNames.length === 0) {
            console.error('[ОШИБКА] Файлы связей (.rels) не найдены. Картинки не могут быть сопоставлены.');
            return data;
        }
        console.log('Найдены файлы связей:', relsFileNames);

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
                    console.log(`Найдена связь: Id=${rId} -> Путь=${imagePath}`);
                    imageRels.set(rId, imagePath);
                }
            });
        }
        if (imageRels.size === 0) {
             console.error('[ОШИБКА] В файлах связей не найдено ни одной ссылки на изображения.');
             return data;
        }

        console.log('%c[ШАГ 4: ПОИСК И ОБРАБОТКА ИЗОБРАЖЕНИЙ]', 'color: blue; font-weight: bold;');
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

                console.log(`--- Обработка якоря: rId=${rId}, строка в Excel=${row} ---`);

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

                    // *** НЕОПРОВЕРЖИМОЕ ДОКАЗАТЕЛЬСТВО ***
                    // ВЫВОДИМ КАРТИНКУ ПРЯМО В КОНСОЛЬ
                    console.log(
                        `%cКартинка для строки ${row} найдена и сконвертирована. Смотри сюда ->`,
                        'font-weight: bold;',
                        'background: url(' + imageSrc + ') no-repeat; background-size: contain; padding: 50px 50px; line-height: 120px;'
                    );

                    const targetIndex = row - 1; // Компенсируем удаленный заголовок

                    if (data[targetIndex]) {
                        console.log(`Прикрепляем картинку к строке данных с индексом ${targetIndex}. Данные ДО:`, JSON.parse(JSON.stringify(data[targetIndex])));
                        
                        if (!data[targetIndex][this.IMAGE_FIELD_NAME]) {
                            data[targetIndex][this.IMAGE_FIELD_NAME] = [];
                        }
                        data[targetIndex][this.IMAGE_FIELD_NAME].push(imageSrc);
                        
                        console.log(`Данные ПОСЛЕ:`, JSON.parse(JSON.stringify(data[targetIndex])));
                        console.log('%c[УСПЕХ] Свойство __images успешно добавлено!', 'color: green; font-weight: bold;');
                    } else {
                        console.error(`[КРИТИЧЕСКАЯ ОШИБКА] Попытка добавить картинку в несуществующую строку данных с индексом ${targetIndex}. Это главная причина проблемы.`);
                    }
                }
            }
        }
        return data;
    }
}
