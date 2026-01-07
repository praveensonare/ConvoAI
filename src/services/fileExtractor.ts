import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedFileData {
  fileName: string;
  fileType: string;
  content: string;
  metadata?: {
    sheets?: string[];
    pageCount?: number;
    size?: number;
    [key: string]: any;
  };
}

/**
 * Extract text from plain text files
 */
export async function extractTextFile(file: File): Promise<ExtractedFileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve({
        fileName: file.name,
        fileType: 'text',
        content,
        metadata: {
          size: file.size,
        },
      });
    };

    reader.onerror = () => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
}

/**
 * Extract data from CSV files
 */
export async function extractCSVFile(file: File): Promise<ExtractedFileData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        // Convert parsed data to readable format
        let content = '';

        if (results.data && results.data.length > 0) {
          // If there's a header row
          const headers = results.data[0] as any[];
          const rows = results.data.slice(1) as any[][];

          // Format as table
          content = `CSV File: ${file.name}\n\n`;
          content += `Total Rows: ${rows.length}\n`;
          content += `Columns: ${headers.join(', ')}\n\n`;

          // Add data preview (first 10 rows)
          content += 'Data Preview:\n';
          content += headers.join(' | ') + '\n';
          content += headers.map(() => '---').join(' | ') + '\n';

          rows.slice(0, 10).forEach((row) => {
            content += row.join(' | ') + '\n';
          });

          if (rows.length > 10) {
            content += `\n... and ${rows.length - 10} more rows`;
          }
        }

        resolve({
          fileName: file.name,
          fileType: 'csv',
          content,
          metadata: {
            rowCount: results.data.length - 1,
            columnCount: (results.data[0] as any[])?.length || 0,
            size: file.size,
          },
        });
      },
      error: (error) => reject(new Error(`Failed to parse CSV: ${error.message}`)),
      header: false,
    });
  });
}

/**
 * Extract data from Excel files (xls, xlsx)
 */
export async function extractExcelFile(file: File): Promise<ExtractedFileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        let content = `Excel File: ${file.name}\n\n`;
        content += `Total Sheets: ${workbook.SheetNames.length}\n`;
        content += `Sheets: ${workbook.SheetNames.join(', ')}\n\n`;

        // Extract data from each sheet
        workbook.SheetNames.forEach((sheetName, index) => {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          content += `--- Sheet ${index + 1}: ${sheetName} ---\n\n`;

          if (jsonData.length > 0) {
            // Format as table
            const headers = jsonData[0] as any[];
            const rows = jsonData.slice(1) as any[][];

            content += `Rows: ${rows.length}\n`;
            content += `Columns: ${headers.join(', ')}\n\n`;

            // Add data preview (first 10 rows)
            content += 'Data Preview:\n';
            content += headers.join(' | ') + '\n';
            content += headers.map(() => '---').join(' | ') + '\n';

            rows.slice(0, 10).forEach((row) => {
              content += row.join(' | ') + '\n';
            });

            if (rows.length > 10) {
              content += `\n... and ${rows.length - 10} more rows\n`;
            }
          } else {
            content += '(Empty sheet)\n';
          }

          content += '\n';
        });

        resolve({
          fileName: file.name,
          fileType: 'excel',
          content,
          metadata: {
            sheets: workbook.SheetNames,
            sheetCount: workbook.SheetNames.length,
            size: file.size,
          },
        });
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${(error as Error).message}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extract text from PDF files
 */
export async function extractPDFFile(file: File): Promise<ExtractedFileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

        let content = `PDF File: ${file.name}\n\n`;
        content += `Total Pages: ${pdf.numPages}\n\n`;

        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();

          content += `--- Page ${pageNum} ---\n\n`;

          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');

          content += pageText + '\n\n';
        }

        resolve({
          fileName: file.name,
          fileType: 'pdf',
          content,
          metadata: {
            pageCount: pdf.numPages,
            size: file.size,
          },
        });
      } catch (error) {
        reject(new Error(`Failed to parse PDF: ${(error as Error).message}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read PDF file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extract text from images using OCR
 */
export async function extractImageFile(file: File): Promise<ExtractedFileData> {
  try {
    const worker = await createWorker('eng');

    const imageUrl = URL.createObjectURL(file);
    const { data: { text } } = await worker.recognize(imageUrl);

    await worker.terminate();
    URL.revokeObjectURL(imageUrl);

    let content = `Image File: ${file.name}\n\n`;

    if (text.trim()) {
      content += 'Extracted Text (OCR):\n\n';
      content += text;
    } else {
      content += 'No text detected in image.';
    }

    return {
      fileName: file.name,
      fileType: 'image',
      content,
      metadata: {
        size: file.size,
        hasText: !!text.trim(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to process image: ${(error as Error).message}`);
  }
}

/**
 * Main function to extract data from any supported file type
 */
export async function extractFileData(file: File): Promise<ExtractedFileData> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  try {
    // Text files
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return await extractTextFile(file);
    }

    // CSV files
    if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      return await extractCSVFile(file);
    }

    // Excel files
    if (
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.xlsx')
    ) {
      return await extractExcelFile(file);
    }

    // PDF files
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await extractPDFFile(file);
    }

    // Image files
    if (
      fileType.startsWith('image/') ||
      fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    ) {
      return await extractImageFile(file);
    }

    // PowerPoint files (not fully supported yet)
    if (
      fileType === 'application/vnd.ms-powerpoint' ||
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      fileName.endsWith('.ppt') ||
      fileName.endsWith('.pptx')
    ) {
      return {
        fileName: file.name,
        fileType: 'powerpoint',
        content: `PowerPoint File: ${file.name}\n\nNote: PowerPoint text extraction is not yet fully supported in the browser. The file has been uploaded but content extraction is limited.`,
        metadata: {
          size: file.size,
          extractionSupported: false,
        },
      };
    }

    // Unsupported file type
    throw new Error(`Unsupported file type: ${fileType || 'unknown'}`);
  } catch (error) {
    throw new Error(`Failed to extract file data: ${(error as Error).message}`);
  }
}

/**
 * Get supported file extensions
 */
export function getSupportedFileTypes(): string {
  return '.txt,.csv,.xls,.xlsx,.pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.ppt,.pptx';
}

/**
 * Check if a file type is supported
 */
export function isFileTypeSupported(file: File): boolean {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  const supportedTypes = [
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  const supportedExtensions = [
    '.txt', '.csv', '.xls', '.xlsx', '.pdf',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
    '.ppt', '.pptx',
  ];

  return (
    supportedTypes.includes(fileType) ||
    fileType.startsWith('image/') ||
    supportedExtensions.some(ext => fileName.endsWith(ext))
  );
}
