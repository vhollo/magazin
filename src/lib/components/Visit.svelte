<script>
  export let doc
  //console.log(doc)
</script>

<a class="btn" href={'https://diabetes.hu/' + ((doc.megjelenes == 'diabetes' || doc.megjelenes == 'hypertonia') && 'cikkek/' || doc.megjelenes == 'diabetes junior' && 'junior' || '' + doc.megjelenes) + '/' + doc.lapszam.substring(2).replace('/k','k').replace('/','0').replace('.','') + '/' + doc.alias} target="_blank">KATTINT</a>
