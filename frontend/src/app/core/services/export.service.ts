import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const base64Data = base64.split(',')[1];
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  public async exportAsExcelWithImages(
    jsonData: any[],
    fileName: string,
    columnsConfig: { key: string, header: string }[],
    imageColumnKey: string
  ): Promise<void> {

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export');

    // 1. Заголовки
    const headerRow = worksheet.getRow(1);
    columnsConfig.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true };
      worksheet.getColumn(i + 1).width = 20;
    });

    // Колонка для фото (если нужно)
    const imageColIndex = columnsConfig.length + 1;
    const imageHeaderCell = headerRow.getCell(imageColIndex);
    imageHeaderCell.value = 'Фото';
    imageHeaderCell.font = { bold: true };
    worksheet.getColumn(imageColIndex).width = 15;

    // 2. Строки
    for (let i = 0; i < jsonData.length; i++) {
      const item = jsonData[i];
      const rowIndex = i + 2;
      const row = worksheet.getRow(rowIndex);
      row.height = 80;

      columnsConfig.forEach((col, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = item[col.key] ?? '';
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      });

      // 3. Вставка изображений
      const imageList = item[imageColumnKey];
      if (Array.isArray(imageList) && imageList.length > 0) {
        const base64 = imageList[0];
        if (typeof base64 === 'string' && base64.startsWith('data:image')) {
          try {
            const buffer = this.base64ToArrayBuffer(base64);
            const ext = base64.includes('image/png') ? 'png' : 'jpeg';

            const imageId = workbook.addImage({
              buffer: buffer,
              extension: ext as 'png' | 'jpeg'
            });

            worksheet.addImage(imageId, {
              tl: { col: imageColIndex - 1, row: rowIndex - 1 },
              ext: { width: 90, height: 90 },
              editAs: 'oneCell'
            } as any);
          } catch (e) {
            console.error(`Ошибка картинки в строке ${rowIndex}:`, e);
          }
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().slice(0, 10);
    saveAs(new Blob([buffer]), `${fileName}_${dateStr}.xlsx`);
  }

  public exportAsCsvFile(jsonData: any[], fileName: string): void {
    // ВАЖНО: Удаляем именно поле 'photos', так как оно теперь стандарт
    const cleanData = jsonData.map(item => {
      const copy = { ...item };
      // Удаляем поле с массивом картинок, чтобы CSV не ломался
      delete copy['photos'];
      delete copy['__images']; // На всякий случай удаляем и старое, если проскочило
      return copy;
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(cleanData);
    const csvOutput: string = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${fileName}.csv`);
  }
}
