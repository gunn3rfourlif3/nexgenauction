
    (function() {
      var cdnOrigin = "https://cdn.shopify.com";
      var scripts = ["/cdn/shopifycloud/checkout-web/assets/c1/polyfills-legacy.DsOoIYnp.js","/cdn/shopifycloud/checkout-web/assets/c1/app-legacy.DA482Jeh.js","/cdn/shopifycloud/checkout-web/assets/c1/locale-en-legacy.GNb_zCM6.js","/cdn/shopifycloud/checkout-web/assets/c1/page-OnePage-legacy.H22av3z2.js","/cdn/shopifycloud/checkout-web/assets/c1/LocalizationExtensionField-legacy.D4nkZkCv.js","/cdn/shopifycloud/checkout-web/assets/c1/RememberMeDescriptionText-legacy.AmbzYkVX.js","/cdn/shopifycloud/checkout-web/assets/c1/ShopPayOptInDisclaimer-legacy.BcXrokc9.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentButtons-legacy.D6te7EKE.js","/cdn/shopifycloud/checkout-web/assets/c1/StockProblemsLineItemList-legacy.CW0d_LGn.js","/cdn/shopifycloud/checkout-web/assets/c1/LocalPickup-legacy.BqzQgHOf.js","/cdn/shopifycloud/checkout-web/assets/c1/useShopPayButtonClassName-legacy.BtGaJoLA.js","/cdn/shopifycloud/checkout-web/assets/c1/VaultedPayment-legacy.hpdQdh_D.js","/cdn/shopifycloud/checkout-web/assets/c1/SeparatePaymentsNotice-legacy.CBr98OHl.js","/cdn/shopifycloud/checkout-web/assets/c1/useAddressManager-legacy.CCKMtekK.js","/cdn/shopifycloud/checkout-web/assets/c1/useShopPayPaymentRequiredMethod-legacy.B0tHtx2N.js","/cdn/shopifycloud/checkout-web/assets/c1/PayButtonSection-legacy.B6da-phS.js","/cdn/shopifycloud/checkout-web/assets/c1/ShipmentBreakdown-legacy.DkkmQCLc.js","/cdn/shopifycloud/checkout-web/assets/c1/MerchandiseModal-legacy.DV_NkeS8.js","/cdn/shopifycloud/checkout-web/assets/c1/StackedMerchandisePreview-legacy.B-88q034.js","/cdn/shopifycloud/checkout-web/assets/c1/component-ShopPayVerificationSwitch-legacy.B0rKbDxO.js","/cdn/shopifycloud/checkout-web/assets/c1/useSubscribeMessenger-legacy.CRYs4mpy.js","/cdn/shopifycloud/checkout-web/assets/c1/index-legacy.Dve0dwkc.js"];
      var styles = [];
      var fontPreconnectUrls = [];
      var fontPrefetchUrls = [];
      var imgPrefetchUrls = ["https://cdn.shopify.com/s/files/1/0660/4295/3801/files/biologica-logo_x320.png?v=1756947060"];

      function preconnect(url, callback) {
        var link = document.createElement('link');
        link.rel = 'dns-prefetch preconnect';
        link.href = url;
        link.crossOrigin = '';
        link.onload = link.onerror = callback;
        document.head.appendChild(link);
      }

      function preconnectAssets() {
        var resources = [cdnOrigin].concat(fontPreconnectUrls);
        var index = 0;
        (function next() {
          var res = resources[index++];
          if (res) preconnect(res, next);
        })();
      }

      function prefetch(url, as, callback) {
        var link = document.createElement('link');
        if (link.relList.supports('prefetch')) {
          link.rel = 'prefetch';
          link.fetchPriority = 'low';
          link.as = as;
          if (as === 'font') link.type = 'font/woff2';
          link.href = url;
          link.crossOrigin = '';
          link.onload = link.onerror = callback;
          document.head.appendChild(link);
        } else {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onloadend = callback;
          xhr.send();
        }
      }

      function prefetchAssets() {
        var resources = [].concat(
          scripts.map(function(url) { return [url, 'script']; }),
          styles.map(function(url) { return [url, 'style']; }),
          fontPrefetchUrls.map(function(url) { return [url, 'font']; }),
          imgPrefetchUrls.map(function(url) { return [url, 'image']; })
        );
        var index = 0;
        function run() {
          var res = resources[index++];
          if (res) prefetch(res[0], res[1], next);
        }
        var next = (self.requestIdleCallback || setTimeout).bind(self, run);
        next();
      }

      function onLoaded() {
        try {
          if (parseFloat(navigator.connection.effectiveType) > 2 && !navigator.connection.saveData) {
            preconnectAssets();
            prefetchAssets();
          }
        } catch (e) {}
      }

      if (document.readyState === 'complete') {
        onLoaded();
      } else {
        addEventListener('load', onLoaded);
      }
    })();
  