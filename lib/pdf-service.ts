import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface BlueLinePosition {
  id: number;
  position: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  description: string;
}

export interface TextFieldMapping {
  field: string;
  x: number;
  y: number;
  label: string;
  fontSize?: number;
  maxWidth?: number;
}

export class BalikaAvedanPDFService {
  private blueLines: BlueLinePosition[];
  private fieldMappings: TextFieldMapping[];

  constructor() {
    this.blueLines = [
      {
        id: 1,
        position: { x1: 50, y1: 100, x2: 550, y2: 100 },
        description: "Line below the header section"
      },
      {
        id: 2,
        position: { x1: 50, y1: 200, x2: 550, y2: 200 },
        description: "Line above the applicant details section"
      },
      {
        id: 3,
        position: { x1: 50, y1: 300, x2: 550, y2: 300 },
        description: "Line above the address section"
      },
      {
        id: 4,
        position: { x1: 50, y1: 400, x2: 550, y2: 400 },
        description: "Line above the nominee and worker details section"
      },
      {
        id: 5,
        position: { x1: 50, y1: 500, x2: 550, y2: 500 },
        description: "Line above the declaration section"
      },
      {
        id: 6,
        position: { x1: 50, y1: 600, x2: 550, y2: 600 },
        description: "Line above the footer section"
      }
    ];

    // Define field mappings relative to blue lines
    this.fieldMappings = [
      // Header section (around blue line 1 at y=100)
      { field: 'formNumber', x: 150, y: 80, label: 'सदस्यता क्रमांक:', fontSize: 10 },
      { field: 'applicationDate', x: 400, y: 80, label: 'आवेदन दिनांक:', fontSize: 10 },
      
      // Applicant details section (around blue line 2 at y=200)
      { field: 'applicantName', x: 150, y: 180, label: 'आवेदक का नाम:', fontSize: 10 },
      { field: 'fatherName', x: 150, y: 200, label: 'पिता का नाम:', fontSize: 10 },
      { field: 'motherName', x: 150, y: 220, label: 'माता का नाम:', fontSize: 10 },
      { field: 'dateOfBirth', x: 150, y: 240, label: 'जन्म तिथि:', fontSize: 10 },
      { field: 'gotra', x: 400, y: 180, label: 'गोत्र:', fontSize: 10 },
      { field: 'age', x: 400, y: 200, label: 'उम्र:', fontSize: 10 },
      { field: 'mobile', x: 400, y: 220, label: 'मोबाइल:', fontSize: 10 },
      { field: 'aadharNumber', x: 400, y: 240, label: 'आधार संख्या:', fontSize: 10 },
      
      // Address section (around blue line 3 at y=300)
      { field: 'address', x: 150, y: 280, label: 'पता:', fontSize: 10, maxWidth: 200 },
      { field: 'pinCode', x: 150, y: 300, label: 'पिन कोड:', fontSize: 10 },
      { field: 'tehsil', x: 400, y: 280, label: 'तहसील:', fontSize: 10 },
      { field: 'district', x: 400, y: 300, label: 'जिला:', fontSize: 10 },
      { field: 'state', x: 400, y: 320, label: 'राज्य:', fontSize: 10 },
      
      // Nominee and worker details section (around blue line 4 at y=400)
      { field: 'nomineeName', x: 150, y: 380, label: 'नामिनी का नाम:', fontSize: 10 },
      { field: 'nomineeRelation', x: 150, y: 400, label: 'नामिनी से सम्बन्ध:', fontSize: 10 },
      { field: 'workerName', x: 400, y: 380, label: 'कार्यकर्ता का नाम:', fontSize: 10 },
      { field: 'workerMobile', x: 400, y: 400, label: 'कार्यकर्ता का मोबाइल:', fontSize: 10 },
      
      // Declaration section (around blue line 5 at y=500)
      { field: 'declaration', x: 150, y: 480, label: 'मैं शपथ लेकर कहता/कहती हूं कि:', fontSize: 10, maxWidth: 350 },
      
      // Footer section (around blue line 6 at y=600)
      { field: 'signature', x: 150, y: 580, label: 'हस्ताक्षर:', fontSize: 10 },
      { field: 'date', x: 400, y: 580, label: 'दिनांक:', fontSize: 10 }
    ];
  }

  async generatePDF(data: Record<string, any>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Load and add the template PDF as background
        const templatePath = path.join(process.cwd(), 'public', 'balika_avedan_form.pdf');
        if (fs.existsSync(templatePath)) {
          doc.image(templatePath, 0, 0, { width: 595, height: 842 });
        }

        // Set up fonts and colors
        doc.font('Helvetica');
        doc.fillColor('black');

        // Fill in the form fields
        this.fieldMappings.forEach((mapping) => {
          const value = data[mapping.field];
          if (value) {
            // Add label
            doc.fontSize(8);
            doc.fillColor('black');
            doc.text(mapping.label, mapping.x, mapping.y);
            
            // Add value
            doc.fontSize(mapping.fontSize || 10);
            doc.fillColor('blue');
            
            const textX = mapping.x + 120;
            const textY = mapping.y;
            
            if (mapping.maxWidth) {
              // Handle long text with wrapping
              doc.text(value.toString(), textX, textY, {
                width: mapping.maxWidth,
                align: 'left'
              });
            } else {
              doc.text(value.toString(), textX, textY);
            }
          }
        });

        // Add blue lines for visual reference (optional)
        doc.strokeColor('blue');
        doc.lineWidth(0.5);
        this.blueLines.forEach((line) => {
          doc.moveTo(line.position.x1, line.position.y1);
          doc.lineTo(line.position.x2, line.position.y2);
          doc.stroke();
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Method to get field positions for debugging
  getFieldPositions() {
    return this.fieldMappings;
  }

  // Method to get blue line positions
  getBlueLinePositions() {
    return this.blueLines;
  }
}
