/**
 * Date formatting utility for API components
 * Converts dates to dd-mm-yyyy format
 */

export function formatDateToDDMMYYYY(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '';

  try {
    let date: Date;

    if (typeof dateValue === 'string') {
      // Handle ISO date strings (YYYY-MM-DD) to avoid timezone issues
      if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
        const parts = dateValue.split('T')[0].split('-');
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      // Handle already formatted dates (dd/mm/yyyy or dd-mm-yyyy)
      else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(dateValue)) {
        const parts = dateValue.split(/[\/\-]/);
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      } else {
        date = new Date(dateValue);
      }
    } else {
      date = dateValue;
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    // Format to dd-mm-yyyy
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format multiple date fields in an object
 */
export function formatDateFields(data: any, dateFields: string[]): any {
  if (!data || typeof data !== 'object') return data;
  
  const formattedData = { ...data };
  
  dateFields.forEach(field => {
    if (formattedData[field]) {
      formattedData[field] = formatDateToDDMMYYYY(formattedData[field]);
    }
  });
  
  return formattedData;
}

/**
 * Format date to dd-mm-yyyy format
 * New function for payment receipt formatting
 */
export function formatDateDDMMYYYY(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '';

  try {
    let date: Date;

    if (typeof dateValue === 'string') {
      // Handle ISO date strings (YYYY-MM-DD) to avoid timezone issues
      if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
        const parts = dateValue.split('T')[0].split('-');
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      // Handle already formatted dates (dd/mm/yyyy or dd-mm-yyyy)
      else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(dateValue)) {
        const parts = dateValue.split(/[\/\-]/);
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
      // Fallback to standard Date parsing
      else {
        date = new Date(dateValue);
      }
    } else {
      date = dateValue;
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    // Format to dd-mm-yyyy
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format date to DD/MM/YYYY format with slashes
 */
export function formatDateToSlashDDMMYYYY(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '';

  try {
    let date: Date;

    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      if (!trimmed) return '';

      // Handle already formatted dates (dd/mm/yyyy or dd-mm-yyyy)
      const ddmmyyyyMatch = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
      if (ddmmyyyyMatch) {
        return `${ddmmyyyyMatch[1]}/${ddmmyyyyMatch[2]}/${ddmmyyyyMatch[3]}`;
      }

      // Handle ISO date strings (yyyy-mm-dd or yyyy/mm/dd)
      const yyyymmddMatch = trimmed.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
      if (yyyymmddMatch) {
        return `${yyyymmddMatch[3]}/${yyyymmddMatch[2]}/${yyyymmddMatch[1]}`;
      }

      date = new Date(trimmed);
    } else {
      date = dateValue;
    }

    if (isNaN(date.getTime())) {
      return '';
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date to DD/MM/YYYY:', error);
    return '';
  }
}
