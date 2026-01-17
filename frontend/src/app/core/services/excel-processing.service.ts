import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import * as JSZip from 'jszip';

@Injectable({
    providedIn: 'root'
})
export class ExcelProcessingService {

    private readonly TARGET_FIELD = 'photos';

    constructor() { }

    public async processFiles(files: File[]): Promise<{ mergedData: any[], sourceData: any[] }> {
        const sourceData: { fileName: string, data: any[] }[] = [];

        for (const file of files) {
            try {
                const data = await this.readExcelFile(file);
                if (data && data.length > 0) {
                    sourceData.push({ fileName: file.name, data });
                }
            } catch (error) {
                console.error(`Ошибка файла ${file.name}:`, error);
            }
        }

        const mergedData = sourceData.flatMap(s => s.data);
        return { mergedData, sourceData };
    }

    private async readExcelFile(file: File): Promise<any[]> {
        const arrayBuffer = await file.arrayBuffer();
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        let workbook;

        if (isCsv) {
            const text = await file.text();
            workbook = XLSX.read(text, { type: 'string' });
        } else {
            workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        }

        if (!workbook.SheetNames.length) return [];
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // 1. Читаем "грязные" данные
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (rawData.length === 0) return [];

        // 2. АГРЕССИВНАЯ ЧИСТКА
        const imageKeywords = ['фотографии', 'фото', 'photo', 'image', 'img', 'picture', 'изображение'];

        // Смотрим на первую строку, чтобы понять, какие ключи удалять
        const firstRowKeys = Object.keys(rawData[0]);
        console.log('Найдены колонки в файле:', firstRowKeys);

        // Определяем ключи-кандидаты на удаление
        const keysToRemove = firstRowKeys.filter(key => {
            const lower = key.toLowerCase().trim();
            // Если ключ похож на картинку И это не наш целевой 'photos'
            return imageKeywords.some(w => lower.includes(w)) && lower !== this.TARGET_FIELD;
        });

        console.log('🔥 БУДУТ УДАЛЕНЫ КОЛОНКИ:', keysToRemove);

        let data = rawData.map(row => {
            const newRow: any = {};
            newRow[this.TARGET_FIELD] = []; // Создаем массив под фотки

            Object.keys(row).forEach(key => {
                // Если ключ в черном списке - пропускаем
                if (keysToRemove.includes(key)) {
                    return;
                }
                // Не перезаписываем наш массив photos данными из Excel
                if (key === this.TARGET_FIELD) {
                    return;
                }
                newRow[key] = row[key];
            });
            return newRow;
        });

        if (isCsv || !file.name.toLowerCase().endsWith('.xlsx')) {
            return data;
        }

        // 3. ДОСТАЕМ ФОТКИ ИЗ НЕДР XLSX
        try {
            const zip = await JSZip.loadAsync(arrayBuffer);

            // DEBUG: Показываем все файлы в архиве
            const allFiles = Object.keys(zip.files);
            console.log('=== XLSX ZIP CONTENTS ===');
            console.log('All files:', allFiles.filter(f => f.includes('drawing') || f.includes('media')));

            const relsFiles = Object.keys(zip.files).filter(n => n.includes('drawings/_rels/drawing') && n.endsWith('.rels'));
            console.log('Rels files found:', relsFiles);

            if (relsFiles.length === 0) {
                console.warn('No drawing rels files found!');
                // Попробуем альтернативный путь
                const altRels = allFiles.filter(f => f.includes('_rels') && f.includes('drawing'));
                console.log('Alternative rels:', altRels);
                return data;
            }

            const imgMap = new Map<string, string>();
            for (const rFile of relsFiles) {
                const xml = await zip.file(rFile)?.async('string');
                if (!xml) continue;
                const rels = new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('Relationship');
                for (let i = 0; i < rels.length; i++) {
                    const id = rels[i].getAttribute('Id');
                    const target = rels[i].getAttribute('Target');
                    if (id && target && target.includes('media/')) {
                        imgMap.set(id, 'xl/media/' + target.split('/').pop());
                    }
                }
            }

            const drawFiles = Object.keys(zip.files).filter(n => n.includes('drawings/drawing') && n.endsWith('.xml'));
            console.log('Drawing files found:', drawFiles);

            for (const dFile of drawFiles) {
                const xml = await zip.file(dFile)?.async('string');
                if (!xml) continue;

                console.log('Parsing drawing file:', dFile);
                const doc = new DOMParser().parseFromString(xml, 'application/xml');

                const anchors = [
                    ...Array.from(doc.getElementsByTagName('xdr:twoCellAnchor')),
                    ...Array.from(doc.getElementsByTagName('xdr:oneCellAnchor'))
                ];
                console.log('Anchors found:', anchors.length);

                for (const anchor of anchors) {
                    const fromNode = anchor.getElementsByTagName('xdr:from')[0];
                    const rowNode = fromNode ? fromNode.getElementsByTagName('xdr:row')[0] : null;
                    if (!rowNode) continue;

                    const rowIndex = parseInt(rowNode.textContent || '-1');
                    const blip = anchor.getElementsByTagName('a:blip')[0];
                    const embedId = blip?.getAttribute('r:embed');

                    if (!embedId || rowIndex < 0) continue;

                    const imgPath = imgMap.get(embedId);
                    if (!imgPath) continue;

                    const imgFile = zip.file(imgPath);
                    if (!imgFile) continue;

                    const b64 = await imgFile.async('base64');
                    const ext = imgPath.split('.').pop() || 'png';
                    const src = `data:image/${ext};base64,${b64}`;

                    const dataIndex = rowIndex - 1;
                    if (data[dataIndex]) {
                        data[dataIndex][this.TARGET_FIELD].push(src);
                    }
                }
            }
        } catch (e) {
            console.warn('Ошибка парсинга картинок:', e);
        }

        // Логируем результат для отладки
        console.log('=== EXCEL PROCESSING RESULT ===');
        data.forEach((row, i) => {
            if (row[this.TARGET_FIELD] && row[this.TARGET_FIELD].length > 0) {
                console.log(`Row ${i}: ${row[this.TARGET_FIELD].length} photos found`);
            }
        });
        console.log('Total rows with photos:', data.filter(r => r[this.TARGET_FIELD]?.length > 0).length);

        return data;
    }
}
