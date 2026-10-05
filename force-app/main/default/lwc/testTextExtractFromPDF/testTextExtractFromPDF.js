import { LightningElement } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import PDF_JS_ZIP from '@salesforce/resourceUrl/pdfjs';

export default class PdfTextExtractor extends LightningElement {
    pdfjsInitialized = false;
    extractedText = '';
    isLoading = false;

    async connectedCallback() {
    try {
        await loadScript(this, PDF_JS_ZIP + '/build/pdf.js');
        await loadScript(this, PDF_JS_ZIP + '/build/pdf.worker.js');

        // Reads from the component's sandboxed window — the real signal
        console.log('PDF.js version:', window.pdfjsLib.version);

        this.pdfjsInitialized = true;
    } catch (error) {
        console.error('Error loading PDF.js', error);
    }
}

    async handleFileChange(event) {
        if (!this.pdfjsInitialized) return;

        const file = event.target.files[0];
        if (!file) return;

        this.isLoading = true;
        this.extractedText = '';

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({
                data: new Uint8Array(arrayBuffer)
            }).promise;

            let fullText = '';
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(i => i.str).join(' ') + '\n\n';
            }
            this.extractedText = fullText;
        } catch (error) {
            console.error('Error parsing PDF text: ', error);
            this.extractedText = 'Error extracting text. Please check the console log.';
        } finally {
            this.isLoading = false;
        }
    }
}