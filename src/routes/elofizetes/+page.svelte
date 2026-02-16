<script module>
	import { browser } from '$app/environment';
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  const lightcolor = '#222'
  const darkcolor = '#ddd'
</script>
<script lang="ts">
  import type { PageProps } from './$types';
    // export let data
// console.log(data)

if (browser) {
  let color = window?.matchMedia('(prefers-color-scheme: dark)').matches ? darkcolor : lightcolor;
  /* window?.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    const colorScheme = event.matches ? "dark" : "light";
    color = colorScheme === 'dark' ? darkcolor : lightcolor;
  }); */
  
  var scriptURL = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
  if (window?.ShopifyBuy) {
    if (window?.ShopifyBuy.UI) {
      ShopifyBuyInit();
    } else {
      loadScript();
    }
  } else {
    loadScript();
  }
  function loadScript() {
    var script = document.createElement('script');
    script.async = true;
    script.src = scriptURL;
    (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(script);
    script.onload = ShopifyBuyInit;
  }
  function ShopifyBuyInit() {
    var client = ShopifyBuy.buildClient({
      domain: 'tud-kiado.myshopify.com',
      storefrontAccessToken: '94cec9c870df862494030b6f488c43a1',
    });
    ShopifyBuy.UI.onReady(client).then(function (ui) {
      ui.createComponent('collection', {
        id: '395347394795',
        node: document.getElementById('collection-component-1719931041752'),
        moneyFormat: '%7B%7Bamount_no_decimals_with_comma_separator%7D%7D',
        options: {
  "product": {
    "styles": {
      "product": {
        "@media (min-width: 600px)": {
          "max-width": "calc(25% - 20px)",
          "margin-left": "20px",
          "margin-bottom": "50px",
          "width": "calc(25% - 20px)"
        }
      },
      "title": {
        "font-weight": "normal",
        "color": color
      },
      "button": {
        "font-weight": "bold",
        ":hover": {
          "background-color": "#3b9ce6"
        },
        "background-color": "#41adff",
        ":focus": {
          "background-color": "#3b9ce6"
        }
      },
      "price": {
        "color": color
      },
      "compareAt": {
        "color": color
      },
      "unitPrice": {
        "color": color
      }
    },
    "text": {
      "button": "Kosárba"
    }
  },
  "productSet": {
    "styles": {
      "products": {
        "@media (min-width: 600px)": {
          "margin-left": "-20px"
        }
      }
    }
  },
  "modalProduct": {
    "contents": {
      "img": false,
      "imgWithCarousel": true,
      "button": false,
      "buttonWithQuantity": true
    },
    "styles": {
      "product": {
        "@media (min-width: 600px)": {
          "max-width": "100%",
          "margin-left": "0px",
          "margin-bottom": "0px"
        }
      },
      "button": {
        "font-weight": "bold",
        ":hover": {
          "background-color": "#3b9ce6"
        },
        "background-color": "#41adff",
        ":focus": {
          "background-color": "#3b9ce6"
        }
      },
      "title": {
        "font-family": "Helvetica Neue, sans-serif",
        "font-weight": "bold",
        "font-size": "26px",
        "color": "#4c4c4c"
      },
      "price": {
        "font-family": "Helvetica Neue, sans-serif",
        "font-weight": "normal",
        "font-size": "18px",
        "color": "#4c4c4c"
      },
      "compareAt": {
        "font-family": "Helvetica Neue, sans-serif",
        "font-weight": "normal",
        "font-size": "15.299999999999999px",
        "color": "#4c4c4c"
      },
      "unitPrice": {
        "font-family": "Helvetica Neue, sans-serif",
        "font-weight": "normal",
        "font-size": "15.299999999999999px",
        "color": "#4c4c4c"
      }
    },
    "text": {
      "button": "db-ot a kosárba"
    }
  },
  "option": {},
  "cart": {
    "styles": {
      "button": {
        "font-weight": "bold",
        ":hover": {
          "background-color": "#3b9ce6"
        },
        "background-color": "#41adff",
        ":focus": {
          "background-color": "#3b9ce6"
        }
      }
    },
    "text": {
      "title": "Kosár",
      "total": "Részösszeg",
      "empty": "A kosár üres.",
      "notice": "Az adót és a szállítási költséget a megrendeléskor számítjuk ki.",
      "button": "Megrendelés",
      "noteDescription": "Üzenet a Kiadónak"
    },
    "contents": {
      "note": true
    }
  },
  "toggle": {
    "styles": {
      "toggle": {
        "font-weight": "bold",
        "background-color": "#41adff",
        ":hover": {
          "background-color": "#3b9ce6"
        },
        ":focus": {
          "background-color": "#3b9ce6"
        }
      }
    }
  }
},
      });
    });
  }
}
const { data }: PageProps = $props()
let count = data.count


</script>

<svelte:head>
  <title>{'Előfizetés • ' + data.conf.sitename}</title>
  <meta name="description" content="Rendeld meg a Diabetes című betegtájékoztató kiadványt, és féláron adjuk mellé a Hypertonia Magazint és a különszámokat!"/>
  <meta name="keywords" content={data.conf.tags.join(', ') || 'diabetes, diabétesz, cukorbetegség, vese, keton, Tudomány Kiadó Kft'}/>
  <meta name="author" content={data.conf.sitename}/>
  <meta name="og:image" content={data.conf.ogi || '/assets/logo-uj-diabetes-web.svg'}/>
  <meta name="og:title" content={'Előfizetés • ' + data.conf.sitename}/>
  <meta name="og:description" content="Rendeld meg a Diabetes című betegtájékoztató kiadványt, és féláron adjuk mellé a Hypertonia Magazint és a különszámokat!"/>
  <meta name="og:url" content={data.conf.url || 'https://diabetes.hu'}/>
  <meta name="og:site_name" content="Diabetes"/>
  <meta name="og:type" content="article"/>
  <meta name="og:locale" content="hu_HU"/>
</svelte:head>

<main class="">
<article class="prose mt-16 mb-8 mx-auto w-full">
  <h1 class="text-center">Előfizetés</h1>
  <p>
    <b>Rendeld meg a Diabetes című betegtájékoztató kiadványt, és féláron adjuk mellé a Hypertonia Magazint és a különszámokat!</b>
    <br>
    <small>(Legfeljebb 3 db-ot)</small>
  </p>
</article>

<div class="px-4 py-6">
  <div id='collection-component-1719931041752'></div>
</div>

<Search {count}/>
<Nav2 actual='elofizetes'/><!--  actual={data.doc.path} -->

</main>