import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

export interface ChartData {
  type: 'table' | 'chart' | 'data';
  data: any[];
  title?: string;
  element?: HTMLElement;
}

// Detect tables in markdown/HTML content
export const detectTablesInMessage = (content: string): ChartData[] => {
  const charts: ChartData[] = [];
  
  // Detect markdown tables
  const markdownTableRegex = /\|(.+)\|[\r\n]+\|[-|\s:]+\|([\s\S]*?)(?=\n\n|\n$|$)/g;
  let match;
  
  while ((match = markdownTableRegex.exec(content)) !== null) {
    const headerRow = match[1].split('|').map(cell => cell.trim()).filter(cell => cell);
    const dataRows = match[2].split('\n').filter(row => row.includes('|'))
      .map(row => row.split('|').map(cell => cell.trim()).filter(cell => cell));
    
    if (headerRow.length > 0 && dataRows.length > 0) {
      const tableData = dataRows.map(row => {
        const obj: any = {};
        headerRow.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
      
      charts.push({
        type: 'table',
        data: tableData,
        title: `Table with ${headerRow.length} columns and ${dataRows.length} rows`
      });
    }
  }
  
  // Detect structured data patterns (key-value pairs, lists with numbers)
  const dataPatterns = [
    /(\w+[\w\s]*?):\s*[\$]?([0-9,]+\.?[0-9]*[%]?)/g, // Key: Value patterns
    /(\w+[\w\s]*?)\s*[-–]\s*[\$]?([0-9,]+\.?[0-9]*[%]?)/g, // Key - Value patterns
  ];
  
  dataPatterns.forEach(pattern => {
    const matches: RegExpExecArray[] = [];
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches.push(match);
    }
    
    if (matches.length >= 3) { // At least 3 data points to be considered a dataset
      const data = matches.map(match => ({
        label: match[1].trim(),
        value: parseFloat(match[2].replace(/[,$%]/g, '')) || match[2]
      }));
      
      charts.push({
        type: 'data',
        data: data,
        title: `Data points (${data.length} items)`
      });
    }
  });
  
  return charts;
};

// Detect chart elements in DOM
export const detectChartElements = (containerElement: HTMLElement): ChartData[] => {
  const charts: ChartData[] = [];
  
  // Look for canvas elements (Chart.js, etc.)
  const canvasElements = containerElement.querySelectorAll('canvas');
  canvasElements.forEach((canvas, index) => {
    if (canvas.width > 100 && canvas.height > 100) { // Likely a chart
      charts.push({
        type: 'chart',
        data: [],
        title: `Chart ${index + 1}`,
        element: canvas
      });
    }
  });
  
  // Look for SVG elements (D3, Recharts, etc.)
  const svgElements = containerElement.querySelectorAll('svg');
  svgElements.forEach((svg, index) => {
    const rect = svg.getBoundingClientRect();
    if (rect.width > 100 && rect.height > 100) { // Likely a chart
      charts.push({
        type: 'chart',
        data: [],
        title: `SVG Chart ${index + 1}`,
        element: svg as any as HTMLElement
      });
    }
  });
  
  // Look for table elements
  const tableElements = containerElement.querySelectorAll('table');
  tableElements.forEach((table, index) => {
    const rows = table.querySelectorAll('tr');
    if (rows.length >= 2) { // At least header + 1 data row
      const data = extractTableData(table);
      charts.push({
        type: 'table',
        data: data,
        title: `Table ${index + 1}`,
        element: table
      });
    }
  });
  
  return charts;
};

// Extract data from HTML table
const extractTableData = (table: HTMLTableElement): any[] => {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length < 2) return [];
  
  const headers = Array.from(rows[0].querySelectorAll('th, td')).map(cell => 
    cell.textContent?.trim() || ''
  );
  
  const data = rows.slice(1).map(row => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = cells[index]?.textContent?.trim() || '';
    });
    return obj;
  });
  
  return data;
};

// Export chart data to Excel
export const exportChartToExcel = async (chartData: ChartData, filename?: string): Promise<void> => {
  try {
    const workbook = XLSX.utils.book_new();
    let worksheetData: any[][] = [];
    
    if (chartData.type === 'table' && chartData.data.length > 0) {
      // Convert table data to worksheet format
      const headers = Object.keys(chartData.data[0]);
      worksheetData = [
        headers,
        ...chartData.data.map(row => headers.map(header => row[header]))
      ];
    } else if (chartData.type === 'data' && chartData.data.length > 0) {
      // Convert data points to worksheet format
      worksheetData = [
        ['Label', 'Value'],
        ...chartData.data.map(item => [item.label || '', item.value || ''])
      ];
    } else if (chartData.type === 'chart' && chartData.element) {
      // For chart elements, try to extract data from the element or create a placeholder
      worksheetData = [
        ['Chart Export', 'Generated from visual chart'],
        ['Note', 'Visual chart exported as image - data may not be available'],
        ['Timestamp', new Date().toISOString()]
      ];
    }
    
    if (worksheetData.length === 0) {
      worksheetData = [
        ['No Data', 'Could not extract data from chart'],
        ['Type', chartData.type],
        ['Title', chartData.title || 'Untitled']
      ];
    }
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart Data');
    
    // Generate filename
    const defaultFilename = `chart_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const finalFilename = filename || chartData.title?.replace(/[^a-z0-9]/gi, '_') + '.xlsx' || defaultFilename;
    
    // Download the file
    XLSX.writeFile(workbook, finalFilename);
    
    console.log(`Chart data exported to ${finalFilename}`);
  } catch (error) {
    console.error('Error exporting chart to Excel:', error);
    throw new Error('Failed to export chart data to Excel');
  }
};

// Export chart element as image (for visual charts)
export const exportChartAsImage = async (element: HTMLElement, filename?: string): Promise<void> => {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      logging: false
    });
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `chart_${new Date().getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
    
    console.log('Chart exported as image');
  } catch (error) {
    console.error('Error exporting chart as image:', error);
    throw new Error('Failed to export chart as image');
  }
};

// Combined export function that handles both data and image export
export const exportChart = async (chartData: ChartData, options?: {
  filename?: string;
  includeImage?: boolean;
  includeData?: boolean;
}): Promise<void> => {
  const { filename, includeImage = true, includeData = true } = options || {};
  
  try {
    if (includeData) {
      await exportChartToExcel(chartData, filename);
    }
    
    if (includeImage && chartData.element) {
      const imageFilename = filename?.replace('.xlsx', '.png') || `chart_image_${new Date().getTime()}.png`;
      await exportChartAsImage(chartData.element, imageFilename);
    }
  } catch (error) {
    console.error('Error in combined chart export:', error);
    throw error;
  }
}; 