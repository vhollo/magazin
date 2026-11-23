<?php
// alapjav: tipografiai cserek a tartalmon ($output = a kimeneti modosito bemenete).
// Szoveg-alapu a megoldas, szandekosan: a tartalmat nem elemezzuk es nem irjuk ujra, igy a
// MODX cimkek ([~id~], [(site_url)] stb.) es a szerkeszto altal irt HTML valtozatlanul jut a MODX-hez.
$map = [
    'A1c' => 'A<sub class="auto">1c</sub>',
    'm2 ' => 'm<sup>2</sup> ',
    'O2'  => 'O<sub>2</sub>',
    'B12' => ' B<sub>12</sub>',
    'B9'  => ' B<sub>9</sub>',
    'B7'  => ' B<sub>7</sub>',
    'B6'  => ' B<sub>6</sub>',
    'B5'  => ' B<sub>5</sub>',
    'B2'  => ' B<sub>2</sub>',
    'B1'  => ' B<sub>1</sub>',
];
$keys = array_keys($map);
$vals = array_values($map);

// Ezeken belul a szoveget nem bantjuk: a linkek szovege marad, a kod-jellegu elemekben es a
// mar meglevo sub/sup-ban nincs ujabb csere.
$skip = ['a' => 0, 'script' => 0, 'style' => 0, 'pre' => 0, 'code' => 0, 'textarea' => 0, 'sub' => 0, 'sup' => 0];
$blocks = ['p', 'li', 'td', 'th', 'tr', 'div', 'ul', 'ol', 'table', 'blockquote', 'figure', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

// A kezzel irt <sup>®</sup> elobb sima ® lesz, hogy lent pontosan egyszer keruljon <sup>-ba.
$output = (string) $output;
$normalised = preg_replace('~<sup>\s*(?:®|&reg;|&#0*174;|&#x0*ae;)\s*</sup>~i', '®', $output);
if ($normalised !== null) {
    $output = $normalised;
}

// Cimkekre/megjegyzesekre (paratlan index) es szovegre (paros index) bontjuk; csak a szoveg valtozik.
$parts = preg_split('~(<!--.*?-->|</?[a-z][^>]*>)~is', $output, -1, PREG_SPLIT_DELIM_CAPTURE);
if ($parts === false) {
    return $output; // biztonsag: hiba eseten a tartalom valtozatlan marad
}

$result = '';
foreach ($parts as $i => $part) {
    if ($i % 2 === 1) {
        if (preg_match('~^<(/?)([a-z][a-z0-9]*)~i', $part, $m)) {
            $tag = strtolower($m[2]);
            if (isset($skip[$tag])) {
                if ($m[1] === '/') {
                    $skip[$tag] = max(0, $skip[$tag] - 1);
                } elseif (substr($part, -2) !== '/>') {
                    $skip[$tag]++;
                }
            } elseif ($m[1] === '/' && in_array($tag, $blocks, true)) {
                $skip['a'] = 0; // a lezaratlan <a> ne nyelje el a kovetkezo blokkokat
            }
        }
        $result .= $part;
    } elseif (array_sum($skip) === 0) {
        $part = str_replace($keys, $vals, $part);
        $part = preg_replace('~®|&reg;|&#0*174;|&#x0*ae;~i', '<sup class="auto">®</sup>', $part);
        $result .= $part;
    } else {
        $result .= $part;
    }
}
return $result;
