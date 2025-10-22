import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx'; // Для старых методов

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Конвертирует строку Base64 в ArrayBuffer
   */
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

  /**
   * Экспорт с изображениями с использованием низкоуровневого API exceljs.
   */
  public async exportAsExcelWithImages(
    jsonData: any[],
    fileName: string,
    columnsConfig: { key: string, header: string }[],
    imageColumnKey: string
  ): Promise<void> {

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Экспорт');

    // === 1. Заголовки ===
    const headerRow = worksheet.getRow(1);
    columnsConfig.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true };
      worksheet.getColumn(i + 1).width = 25;
    });
    const imageColIndex = columnsConfig.length + 1;
    headerRow.getCell(imageColIndex).value = 'Фото';
    worksheet.getColumn(imageColIndex).width = 25;

    // === 2. Строки ===
    for (let i = 0; i < jsonData.length; i++) {
      const item = jsonData[i];
      const rowIndex = i + 2;
      const row = worksheet.getRow(rowIndex);
      row.height = 90;

      // Вставляем только текстовые колонки
      columnsConfig.forEach((col, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = item[col.key] ?? '';
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      });

      // === 3. Вставляем изображение ===
      const imageList = item[imageColumnKey];
      if (Array.isArray(imageList) && imageList.length > 0) {
        const base64 = imageList[0];
        if (base64.startsWith('data:image')) {
          try {
            const buffer = this.base64ToArrayBuffer(base64);
            const ext = base64.includes('png') ? 'png' : 'jpeg';
            const imageId = workbook.addImage({ buffer, extension: ext });

            worksheet.addImage(imageId, {
              tl: { col: imageColIndex - 1, row: rowIndex - 1 },
              ext: { width: 90, height: 90 }
            });
          } catch (e) {
            console.error(`Ошибка вставки изображения для строки ${rowIndex}:`, e);
          }
        }
      }
    }

    // === 4. Сохраняем ===
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${fileName}_${Date.now()}.xlsx`);
  }

  public exportAsCsvFile(jsonData: any[], fileName: string): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(jsonData);
    const csvOutput: string = XLSX.utils.sheet_to_csv(worksheet);
    this.saveAsFile(csvOutput, fileName, 'text/csv;charset=utf-8;', '.csv');
  }

  private saveAsFile(buffer: any, fileName: string, fileType: string, fileExtension: string): void {
    const data: Blob = new Blob([buffer], { type: fileType });
    saveAs(data, `${fileName}_export_${new Date().getTime()}${fileExtension}`);
  }
}
