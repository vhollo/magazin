// place files you want to import through the `$lib` alias in this folder.

const cats = {
  'orvos': 'Orvosok üzenetei',
  'szemle': 'Hasznos tudnivalók',
  'elet': 'Személyes történetek',
  'mod': 'Egészséges életmód',
  'recept': 'Receptek'
}

export const _tv = ({tv, val}) => {
  //console.log(tv,val)
  switch (tv) {
    case 'sze':
      return val.replace('_', ' ')
    case 'cat':
      return cats[val]
  }

}