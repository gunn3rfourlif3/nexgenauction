const axios = require('axios');

class CurrencyService {
  constructor() {
    // Supported currencies
    this.supportedCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
      'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR', 'KRW'
    ];
    
    // Base currency for internal calculations
    this.baseCurrency = 'USD';
    
    // Exchange rate cache
    this.exchangeRates = {};
    this.lastUpdated = null;
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Fallback exchange rates (updated periodically)
    this.fallbackRates = {
      'USD': 1.0,
      'EUR': 0.85,
      'GBP': 0.73,
      'JPY': 110.0,
      'CAD': 1.25,
      'AUD': 1.35,
      'CHF': 0.92,
      'CNY': 6.45,
      'SEK': 8.60,
      'NZD': 1.42,
      'MXN': 20.15,
      'SGD': 1.35,
      'HKD': 7.80,
      'NOK': 8.50,
      'TRY': 8.75,
      'RUB': 75.0,
      'INR': 74.5,
      'BRL': 5.20,
      'ZAR': 14.8,
      'KRW': 1180.0
    };
    
    // Currency display information
    this.currencyInfo = {
      'USD': { name: 'US Dollar', symbol: '$', decimals: 2 },
      'EUR': { name: 'Euro', symbol: '€', decimals: 2 },
      'GBP': { name: 'British Pound', symbol: '£', decimals: 2 },
      'JPY': { name: 'Japanese Yen', symbol: '¥', decimals: 0 },
      'CAD': { name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
      'AUD': { name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
      'CHF': { name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
      'CNY': { name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
      'SEK': { name: 'Swedish Krona', symbol: 'kr', decimals: 2 },
      'NZD': { name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 },
      'MXN': { name: 'Mexican Peso', symbol: '$', decimals: 2 },
      'SGD': { name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
      'HKD': { name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2 },
      'NOK': { name: 'Norwegian Krone', symbol: 'kr', decimals: 2 },
      'TRY': { name: 'Turkish Lira', symbol: '₺', decimals: 2 },
      'RUB': { name: 'Russian Ruble', symbol: '₽', decimals: 2 },
      'INR': { name: 'Indian Rupee', symbol: '₹', decimals: 2 },
      'BRL': { name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
      'ZAR': { name: 'South African Rand', symbol: 'R', decimals: 2 },
      'KRW': { name: 'South Korean Won', symbol: '₩', decimals: 0 }
    };
  }

  /**
   * Check if currency is supported
   * @param {string} currency - Currency code
   * @returns {boolean} Is supported
   */
  isSupportedCurrency(currency) {
    return this.supportedCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Get currency information
   * @param {string} currency - Currency code
   * @returns {Object} Currency info
   */
  getCurrencyInfo(currency) {
    const upperCurrency = currency.toUpperCase();
    return this.currencyInfo[upperCurrency] || null;
  }

  /**
   * Get all supported currencies with their info
   * @returns {Array} Supported currencies
   */
  getSupportedCurrencies() {
    return this.supportedCurrencies.map(code => ({
      code,
      ...this.currencyInfo[code]
    }));
  }

  /**
   * Check if exchange rates need updating
   * @returns {boolean} Needs update
   */
  needsRateUpdate() {
    if (!this.lastUpdated) return true;
    return (Date.now() - this.lastUpdated) > this.cacheExpiry;
  }

  /**
   * Fetch exchange rates from external API
   * @returns {Object} Fetch result
   */
  async fetchExchangeRates() {
    try {
      // Using exchangerate-api.com (free tier)
      const apiKey = process.env.EXCHANGE_RATE_API_KEY;
      let url;
      
      if (apiKey) {
        // Paid API with higher limits
        url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${this.baseCurrency}`;
      } else {
        // Free API with lower limits
        url = `https://api.exchangerate-api.com/v4/latest/${this.baseCurrency}`;
      }

      const response = await axios.get(url, {
        timeout: 10000 // 10 second timeout
      });

      if (response.data && response.data.rates) {
        this.exchangeRates = response.data.rates;
        this.lastUpdated = Date.now();
        
        console.log('Exchange rates updated successfully');
        return {
          success: true,
          rates: this.exchangeRates,
          source: 'api'
        };
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error.message);
      
      // Use fallback rates
      this.exchangeRates = { ...this.fallbackRates };
      this.lastUpdated = Date.now();
      
      return {
        success: false,
        error: error.message,
        rates: this.exchangeRates,
        source: 'fallback'
      };
    }
  }

  /**
   * Get current exchange rates
   * @param {boolean} forceUpdate - Force update from API
   * @returns {Object} Exchange rates
   */
  async getExchangeRates(forceUpdate = false) {
    try {
      if (forceUpdate || this.needsRateUpdate()) {
        await this.fetchExchangeRates();
      }

      return {
        success: true,
        rates: this.exchangeRates,
        lastUpdated: this.lastUpdated,
        baseCurrency: this.baseCurrency
      };
    } catch (error) {
      console.error('Failed to get exchange rates:', error);
      return {
        success: false,
        error: error.message,
        rates: this.fallbackRates,
        source: 'fallback'
      };
    }
  }

  /**
   * Get exchange rate between two currencies
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Object} Exchange rate result
   */
  async getExchangeRate(fromCurrency, toCurrency) {
    try {
      const from = fromCurrency.toUpperCase();
      const to = toCurrency.toUpperCase();

      if (!this.isSupportedCurrency(from) || !this.isSupportedCurrency(to)) {
        return {
          success: false,
          error: 'Unsupported currency'
        };
      }

      if (from === to) {
        return {
          success: true,
          rate: 1.0,
          fromCurrency: from,
          toCurrency: to
        };
      }

      // Ensure we have current rates
      const ratesResult = await this.getExchangeRates();
      
      if (!ratesResult.success) {
        return ratesResult;
      }

      const rates = ratesResult.rates;

      // Convert via base currency (USD)
      let rate;
      
      if (from === this.baseCurrency) {
        rate = rates[to];
      } else if (to === this.baseCurrency) {
        rate = 1 / rates[from];
      } else {
        // Convert from -> USD -> to
        rate = rates[to] / rates[from];
      }

      if (!rate || isNaN(rate)) {
        return {
          success: false,
          error: 'Exchange rate not available'
        };
      }

      return {
        success: true,
        rate: parseFloat(rate.toFixed(6)),
        fromCurrency: from,
        toCurrency: to,
        lastUpdated: this.lastUpdated
      };
    } catch (error) {
      console.error('Failed to get exchange rate:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert amount between currencies
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Object} Conversion result
   */
  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      if (!amount || isNaN(amount) || amount < 0) {
        return {
          success: false,
          error: 'Invalid amount'
        };
      }

      const rateResult = await this.getExchangeRate(fromCurrency, toCurrency);
      
      if (!rateResult.success) {
        return rateResult;
      }

      const convertedAmount = amount * rateResult.rate;
      const toCurrencyInfo = this.getCurrencyInfo(toCurrency);
      const decimals = toCurrencyInfo ? toCurrencyInfo.decimals : 2;
      
      return {
        success: true,
        originalAmount: amount,
        convertedAmount: parseFloat(convertedAmount.toFixed(decimals)),
        fromCurrency: rateResult.fromCurrency,
        toCurrency: rateResult.toCurrency,
        exchangeRate: rateResult.rate,
        lastUpdated: rateResult.lastUpdated
      };
    } catch (error) {
      console.error('Failed to convert currency:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert amount to base currency (USD)
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency
   * @returns {Object} Conversion result
   */
  async convertToBaseCurrency(amount, fromCurrency) {
    return await this.convertCurrency(amount, fromCurrency, this.baseCurrency);
  }

  /**
   * Convert amount from base currency
   * @param {number} amount - Amount in base currency
   * @param {string} toCurrency - Target currency
   * @returns {Object} Conversion result
   */
  async convertFromBaseCurrency(amount, toCurrency) {
    return await this.convertCurrency(amount, this.baseCurrency, toCurrency);
  }

  /**
   * Format currency amount for display
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @param {Object} options - Formatting options
   * @returns {string} Formatted amount
   */
  formatCurrency(amount, currency, options = {}) {
    try {
      const upperCurrency = currency.toUpperCase();
      const currencyInfo = this.getCurrencyInfo(upperCurrency);
      
      if (!currencyInfo) {
        return `${amount} ${upperCurrency}`;
      }

      const {
        showSymbol = true,
        showCode = false,
        locale = 'en-US'
      } = options;

      const formatOptions = {
        style: 'currency',
        currency: upperCurrency,
        minimumFractionDigits: currencyInfo.decimals,
        maximumFractionDigits: currencyInfo.decimals
      };

      let formatted = new Intl.NumberFormat(locale, formatOptions).format(amount);

      // Custom formatting for specific requirements
      if (!showSymbol && showCode) {
        formatted = `${amount.toFixed(currencyInfo.decimals)} ${upperCurrency}`;
      } else if (showSymbol && showCode) {
        formatted = `${formatted} (${upperCurrency})`;
      }

      return formatted;
    } catch (error) {
      console.error('Failed to format currency:', error);
      return `${amount} ${currency}`;
    }
  }

  /**
   * Get currency conversion for multiple amounts
   * @param {Array} conversions - Array of {amount, fromCurrency, toCurrency}
   * @returns {Object} Batch conversion result
   */
  async batchConvertCurrency(conversions) {
    try {
      const results = [];
      
      for (const conversion of conversions) {
        const result = await this.convertCurrency(
          conversion.amount,
          conversion.fromCurrency,
          conversion.toCurrency
        );
        
        results.push({
          ...conversion,
          result
        });
      }

      return {
        success: true,
        conversions: results
      };
    } catch (error) {
      console.error('Failed to batch convert currency:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get popular currency pairs for a base currency
   * @param {string} baseCurrency - Base currency
   * @returns {Array} Popular pairs
   */
  getPopularPairs(baseCurrency = 'USD') {
    const popularCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
    const base = baseCurrency.toUpperCase();
    
    return popularCurrencies
      .filter(currency => currency !== base)
      .map(currency => ({
        from: base,
        to: currency,
        pair: `${base}/${currency}`
      }));
  }

  /**
   * Validate currency conversion request
   * @param {Object} request - Conversion request
   * @returns {Object} Validation result
   */
  validateConversionRequest(request) {
    const { amount, fromCurrency, toCurrency } = request;
    
    const errors = [];
    
    if (!amount || isNaN(amount) || amount <= 0) {
      errors.push('Amount must be a positive number');
    }
    
    if (!fromCurrency || !this.isSupportedCurrency(fromCurrency)) {
      errors.push('Invalid source currency');
    }
    
    if (!toCurrency || !this.isSupportedCurrency(toCurrency)) {
      errors.push('Invalid target currency');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get currency statistics
   * @returns {Object} Currency statistics
   */
  getCurrencyStats() {
    return {
      supportedCurrencies: this.supportedCurrencies.length,
      baseCurrency: this.baseCurrency,
      lastRateUpdate: this.lastUpdated,
      cacheExpiry: this.cacheExpiry,
      ratesAvailable: Object.keys(this.exchangeRates).length
    };
  }
}

module.exports = new CurrencyService();