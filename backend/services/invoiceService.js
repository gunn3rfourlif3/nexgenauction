const Payment = require('../models/Payment');
const Auction = require('../models/Auction');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class InvoiceService {
  constructor() {
    this.invoiceDirectory = path.join(__dirname, '../invoices');
    this.ensureInvoiceDirectory();
    
    // Tax rates by country/region (can be moved to database)
    this.taxRates = {
      'US': 0.08, // 8% average sales tax
      'CA': 0.13, // 13% HST
      'GB': 0.20, // 20% VAT
      'DE': 0.19, // 19% VAT
      'FR': 0.20, // 20% VAT
      'AU': 0.10, // 10% GST
      'JP': 0.10, // 10% consumption tax
      'default': 0.00 // No tax for other countries
    };
    
    // Buyer's premium rates (percentage of winning bid)
    this.buyersPremiumRates = [
      { min: 0, max: 1000, rate: 0.25 }, // 25% on first $1,000
      { min: 1000, max: 10000, rate: 0.20 }, // 20% on $1,001-$10,000
      { min: 10000, max: Infinity, rate: 0.15 } // 15% above $10,000
    ];
    
    // Shipping rates by region
    this.shippingRates = {
      'domestic': {
        'standard': 15.00,
        'express': 35.00,
        'overnight': 75.00
      },
      'international': {
        'standard': 45.00,
        'express': 85.00,
        'overnight': 150.00
      }
    };
  }

  /**
   * Ensure invoice directory exists
   */
  ensureInvoiceDirectory() {
    if (!fs.existsSync(this.invoiceDirectory)) {
      fs.mkdirSync(this.invoiceDirectory, { recursive: true });
    }
  }

  /**
   * Calculate buyer's premium based on winning bid amount
   * @param {number} amount - Winning bid amount
   * @returns {number} Buyer's premium amount
   */
  calculateBuyersPremium(amount) {
    let premium = 0;
    let remainingAmount = amount;

    for (const tier of this.buyersPremiumRates) {
      if (remainingAmount <= 0) break;

      const tierAmount = Math.min(remainingAmount, tier.max - tier.min);
      premium += tierAmount * tier.rate;
      remainingAmount -= tierAmount;
    }

    return Math.round(premium * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate tax based on country and amount
   * @param {string} country - Country code
   * @param {number} amount - Taxable amount
   * @returns {number} Tax amount
   */
  calculateTax(country, amount) {
    const taxRate = this.taxRates[country] || this.taxRates.default;
    return Math.round(amount * taxRate * 100) / 100;
  }

  /**
   * Calculate shipping cost
   * @param {string} shippingMethod - Shipping method
   * @param {boolean} isInternational - Is international shipping
   * @returns {number} Shipping cost
   */
  calculateShipping(shippingMethod = 'standard', isInternational = false) {
    const region = isInternational ? 'international' : 'domestic';
    return this.shippingRates[region][shippingMethod] || this.shippingRates[region]['standard'];
  }

  /**
   * Generate invoice data for a payment
   * @param {string} paymentId - Payment ID
   * @param {Object} options - Invoice options
   * @returns {Object} Invoice data
   */
  async generateInvoiceData(paymentId, options = {}) {
    try {
      const payment = await Payment.findOne({ paymentId })
        .populate({
          path: 'auction',
          populate: {
            path: 'seller',
            select: 'username email businessInfo'
          }
        })
        .populate('buyer', 'username email billingAddress shippingAddress');

      if (!payment) {
        throw new Error('Payment not found');
      }

      const auction = payment.auction;
      const buyer = payment.buyer;
      const seller = auction.seller;

      // Base amounts
      const winningBidAmount = payment.amount;
      const buyersPremium = this.calculateBuyersPremium(winningBidAmount);
      
      // Shipping calculation
      const isInternational = options.isInternational || false;
      const shippingMethod = options.shippingMethod || 'standard';
      const shippingCost = options.shippingCost || this.calculateShipping(shippingMethod, isInternational);
      
      // Subtotal (bid + premium + shipping)
      const subtotal = winningBidAmount + buyersPremium + shippingCost;
      
      // Tax calculation (on subtotal)
      const buyerCountry = buyer.billingAddress?.country || 'US';
      const taxAmount = this.calculateTax(buyerCountry, subtotal);
      
      // Total amount
      const totalAmount = subtotal + taxAmount;

      // Generate invoice number
      const invoiceNumber = this.generateInvoiceNumber(payment.createdAt);

      const invoiceData = {
        invoiceNumber,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        
        // Payment info
        paymentId: payment.paymentId,
        paymentStatus: payment.status,
        paymentMethod: payment.paymentMethod,
        currency: payment.currency,
        
        // Auction info
        auction: {
          id: auction._id,
          title: auction.title,
          description: auction.description,
          lotNumber: auction.lotNumber || 'N/A',
          category: auction.category,
          endDate: auction.endDate
        },
        
        // Parties
        seller: {
          name: seller.businessInfo?.companyName || seller.username,
          email: seller.email,
          address: seller.businessInfo?.address || 'Address not provided',
          taxId: seller.businessInfo?.taxId || null
        },
        buyer: {
          name: buyer.username,
          email: buyer.email,
          billingAddress: buyer.billingAddress || {},
          shippingAddress: buyer.shippingAddress || buyer.billingAddress || {}
        },
        
        // Financial breakdown
        lineItems: [
          {
            description: `Winning bid for "${auction.title}"`,
            quantity: 1,
            unitPrice: winningBidAmount,
            total: winningBidAmount
          },
          {
            description: "Buyer's Premium",
            quantity: 1,
            unitPrice: buyersPremium,
            total: buyersPremium,
            note: `Calculated on sliding scale: 25% first $1,000, 20% next $9,000, 15% above $10,000`
          },
          {
            description: `Shipping (${shippingMethod}, ${isInternational ? 'International' : 'Domestic'})`,
            quantity: 1,
            unitPrice: shippingCost,
            total: shippingCost
          }
        ],
        
        // Totals
        amounts: {
          winningBid: winningBidAmount,
          buyersPremium,
          shipping: shippingCost,
          subtotal,
          tax: taxAmount,
          taxRate: this.taxRates[buyerCountry] || this.taxRates.default,
          total: totalAmount
        },
        
        // Terms and conditions
        terms: {
          paymentTerms: 'Payment due within 30 days of invoice date',
          shippingTerms: 'Items will be shipped upon receipt of full payment',
          returnPolicy: 'All sales are final. Items sold as-is.',
          disputePolicy: 'Disputes must be raised within 7 days of delivery'
        },
        
        // Additional info
        notes: options.notes || '',
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'system',
          version: '1.0'
        }
      };

      return {
        success: true,
        invoiceData
      };
    } catch (error) {
      console.error('Failed to generate invoice data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate invoice number
   * @param {Date} date - Invoice date
   * @returns {string} Invoice number
   */
  generateInvoiceNumber(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    
    return `INV-${year}${month}${day}-${timestamp}`;
  }

  /**
   * Generate PDF invoice
   * @param {Object} invoiceData - Invoice data
   * @returns {Object} PDF generation result
   */
  async generatePDFInvoice(invoiceData) {
    try {
      const fileName = `${invoiceData.invoiceNumber}.pdf`;
      const filePath = path.join(this.invoiceDirectory, fileName);

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        
        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('INVOICE', 50, 50);
        doc.fontSize(12).text(`Invoice #: ${invoiceData.invoiceNumber}`, 50, 80);
        doc.text(`Date: ${invoiceData.invoiceDate.toLocaleDateString()}`, 50, 95);
        doc.text(`Due Date: ${invoiceData.dueDate.toLocaleDateString()}`, 50, 110);

        // Seller info
        doc.fontSize(14).text('From:', 50, 140);
        doc.fontSize(10)
          .text(invoiceData.seller.name, 50, 160)
          .text(invoiceData.seller.email, 50, 175)
          .text(invoiceData.seller.address, 50, 190);

        // Buyer info
        doc.fontSize(14).text('To:', 300, 140);
        doc.fontSize(10)
          .text(invoiceData.buyer.name, 300, 160)
          .text(invoiceData.buyer.email, 300, 175);
        
        if (invoiceData.buyer.billingAddress.street) {
          doc.text(`${invoiceData.buyer.billingAddress.street}`, 300, 190)
             .text(`${invoiceData.buyer.billingAddress.city}, ${invoiceData.buyer.billingAddress.state} ${invoiceData.buyer.billingAddress.zipCode}`, 300, 205)
             .text(invoiceData.buyer.billingAddress.country, 300, 220);
        }

        // Auction info
        doc.fontSize(14).text('Auction Details:', 50, 250);
        doc.fontSize(10)
          .text(`Title: ${invoiceData.auction.title}`, 50, 270)
          .text(`Category: ${invoiceData.auction.category}`, 50, 285)
          .text(`Lot Number: ${invoiceData.auction.lotNumber}`, 50, 300)
          .text(`End Date: ${invoiceData.auction.endDate.toLocaleDateString()}`, 50, 315);

        // Line items table
        let yPosition = 350;
        doc.fontSize(12).text('Description', 50, yPosition);
        doc.text('Qty', 300, yPosition);
        doc.text('Unit Price', 350, yPosition);
        doc.text('Total', 450, yPosition);
        
        // Draw line under headers
        doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
        
        yPosition += 25;
        
        invoiceData.lineItems.forEach(item => {
          doc.fontSize(10)
            .text(item.description, 50, yPosition, { width: 240 })
            .text(item.quantity.toString(), 300, yPosition)
            .text(`${invoiceData.currency} ${item.unitPrice.toFixed(2)}`, 350, yPosition)
            .text(`${invoiceData.currency} ${item.total.toFixed(2)}`, 450, yPosition);
          
          yPosition += 20;
          
          if (item.note) {
            doc.fontSize(8).text(item.note, 70, yPosition, { width: 220 });
            yPosition += 15;
          }
        });

        // Totals
        yPosition += 20;
        doc.moveTo(350, yPosition).lineTo(550, yPosition).stroke();
        yPosition += 10;
        
        doc.fontSize(10)
          .text('Subtotal:', 350, yPosition)
          .text(`${invoiceData.currency} ${invoiceData.amounts.subtotal.toFixed(2)}`, 450, yPosition);
        
        yPosition += 15;
        doc.text(`Tax (${(invoiceData.amounts.taxRate * 100).toFixed(1)}%):`, 350, yPosition)
          .text(`${invoiceData.currency} ${invoiceData.amounts.tax.toFixed(2)}`, 450, yPosition);
        
        yPosition += 15;
        doc.fontSize(12)
          .text('Total:', 350, yPosition)
          .text(`${invoiceData.currency} ${invoiceData.amounts.total.toFixed(2)}`, 450, yPosition);

        // Terms and conditions
        yPosition += 40;
        doc.fontSize(12).text('Terms & Conditions:', 50, yPosition);
        yPosition += 20;
        
        doc.fontSize(9)
          .text(`• ${invoiceData.terms.paymentTerms}`, 50, yPosition)
          .text(`• ${invoiceData.terms.shippingTerms}`, 50, yPosition + 12)
          .text(`• ${invoiceData.terms.returnPolicy}`, 50, yPosition + 24)
          .text(`• ${invoiceData.terms.disputePolicy}`, 50, yPosition + 36);

        // Footer
        doc.fontSize(8)
          .text('This invoice was generated automatically by NexGenAuction.', 50, 750)
          .text(`Payment ID: ${invoiceData.paymentId}`, 50, 765);

        doc.end();

        stream.on('finish', () => {
          resolve({
            success: true,
            fileName,
            filePath,
            message: 'PDF invoice generated successfully'
          });
        });

        stream.on('error', (error) => {
          reject({
            success: false,
            error: error.message
          });
        });
      });
    } catch (error) {
      console.error('Failed to generate PDF invoice:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate complete invoice (data + PDF)
   * @param {string} paymentId - Payment ID
   * @param {Object} options - Invoice options
   * @returns {Object} Complete invoice generation result
   */
  async generateInvoice(paymentId, options = {}) {
    try {
      // Generate invoice data
      const dataResult = await this.generateInvoiceData(paymentId, options);
      
      if (!dataResult.success) {
        return dataResult;
      }

      // Generate PDF
      const pdfResult = await this.generatePDFInvoice(dataResult.invoiceData);
      
      if (!pdfResult.success) {
        return pdfResult;
      }

      // Update payment with invoice information
      await Payment.findOneAndUpdate(
        { paymentId },
        {
          'invoice.invoiceNumber': dataResult.invoiceData.invoiceNumber,
          'invoice.invoiceDate': dataResult.invoiceData.invoiceDate,
          'invoice.invoiceAmount': dataResult.invoiceData.amounts.total,
          'invoice.invoiceFilePath': pdfResult.filePath,
          'invoice.isGenerated': true
        }
      );

      return {
        success: true,
        message: 'Invoice generated successfully',
        invoice: {
          invoiceNumber: dataResult.invoiceData.invoiceNumber,
          invoiceDate: dataResult.invoiceData.invoiceDate,
          totalAmount: dataResult.invoiceData.amounts.total,
          currency: dataResult.invoiceData.currency,
          fileName: pdfResult.fileName,
          filePath: pdfResult.filePath
        },
        invoiceData: dataResult.invoiceData
      };
    } catch (error) {
      console.error('Failed to generate complete invoice:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get invoice file path
   * @param {string} invoiceNumber - Invoice number
   * @returns {string} File path
   */
  getInvoiceFilePath(invoiceNumber) {
    return path.join(this.invoiceDirectory, `${invoiceNumber}.pdf`);
  }

  /**
   * Check if invoice file exists
   * @param {string} invoiceNumber - Invoice number
   * @returns {boolean} File exists
   */
  invoiceFileExists(invoiceNumber) {
    const filePath = this.getInvoiceFilePath(invoiceNumber);
    return fs.existsSync(filePath);
  }

  /**
   * Delete invoice file
   * @param {string} invoiceNumber - Invoice number
   * @returns {Object} Deletion result
   */
  deleteInvoiceFile(invoiceNumber) {
    try {
      const filePath = this.getInvoiceFilePath(invoiceNumber);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return {
          success: true,
          message: 'Invoice file deleted successfully'
        };
      } else {
        return {
          success: false,
          error: 'Invoice file not found'
        };
      }
    } catch (error) {
      console.error('Failed to delete invoice file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new InvoiceService();