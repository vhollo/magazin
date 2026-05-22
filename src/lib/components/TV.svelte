<script module>
  const cats = {
    'orvos': 'Orvosok üzenetei',
    'szemle': 'Hasznos tudnivalók',
    'elet': 'Személyes történetek',
    'mod': 'Egészséges életmód',
    'recept': 'Receptek'
  }
</script>
<script> // @ts-nocheck

  export let tv

  let out
  const {key, val} = Object.entries(tv)[0]
  //console.log(key, val)
  switch (key) {
    case 'sze':
      out = val.replace('_', ' ')
      break
    case 'cat':
      out = val.replace('_', ' ')
      break
  }
</script>

{out}