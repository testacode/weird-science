# Fuentes de los datos

Registro de cada constante verificada: valor en el código, valor de la fuente y referencia. Sirve de base para la bibliografía de cada lab.
Consultas hechas en navegador real (Chrome) el 2026-10-01, salvo que se indique otra fecha.

## Partículas (`src/labs/particulas/model.ts`)

Conversión: J/(mol·K) ÷ masa molar = J/(g·K). Etanol 46,07 g/mol; acetona 58,08 g/mol.

- Agua: fusión 334 J/g, vaporización 2.257 J/g, c del hielo 2,09, del líquido 4,18 y del vapor 2,01 J/(g·K). Wikipedia (cita el CRC) da ΔfusH 6,01 kJ/mol (= 333,6 J/g), ΔvapH a 100 °C 40,68 kJ/mol (= 2.258 J/g), cp del hielo a −2,2 °C 37,84 J/(mol·K) (= 2,10), del líquido 4,18 a 20–40 °C y del vapor a 100 °C 36,5 J/(mol·K) (= 2,03). OK.
  Water (data page), Wikipedia — https://en.wikipedia.org/wiki/Water_(data_page)

- Etanol, calor de fusión: código 108 J/g. NIST: ΔfusH 4,63–5,02 kJ/mol (≈ 101–109 J/g). OK.
  NIST Chemistry WebBook, Ethanol, Phase change data — https://webbook.nist.gov/cgi/cbook.cgi?ID=C64175&Units=SI&Mask=4
- Etanol, calor de vaporización: código 840 J/g. NIST: ΔvapH 38,56 kJ/mol a 351,5 K (= 837 J/g). OK. Misma fuente.
- Etanol, calor específico del líquido: código 2,44 J/(g·K). NIST: Cp 110,5–115,9 J/(mol·K) a 298 K (= 2,40–2,52). OK.
  NIST, Ethanol, Condensed phase thermochemistry data — https://webbook.nist.gov/cgi/cbook.cgi?ID=C64175&Units=SI&Mask=2
- Etanol, calor específico del gas: código 1,5 J/(g·K). NIST: 73,15 J/(mol·K) a 350 K (= 1,59). Wikipedia: 78,28 J/(mol·K) a 90 °C (= 1,70). Estaba 6–12 % bajo: corregido a 1,6.
  NIST, Ethanol, Gas phase thermochemistry data — https://webbook.nist.gov/cgi/cbook.cgi?ID=C64175&Units=SI&Mask=1
  Ethanol (data page), Wikipedia — https://en.wikipedia.org/wiki/Ethanol_(data_page)
- Etanol, calor específico del sólido: código 1,9 J/(g·K). NIST no lo tiene. Libro de texto: 0,97 J/(g·K). Estaba ≈ 2 veces alto: corregido a 0,97.
  Brown, LeMay et al., *Chemistry: The Central Science*, 13.ª ed., problema 11.45 (vía https://www.vaia.com/en-us/textbooks/chemistry/chemistry-the-central-science-13-edition/chapter-11/problem-45-ethanol-leftmathrmc2-mathrmh5-mathrmohright-melts/)
- Acetona, calor de fusión: código 98 J/g. NIST: ΔfusH 5,69–5,72 kJ/mol (= 98 J/g). OK.
  NIST, Acetone, Phase change data — https://webbook.nist.gov/cgi/cbook.cgi?ID=C67641&Units=SI&Mask=4
- Acetona, calor de vaporización: código 501 J/g. NIST: 29,1 kJ/mol a 329,3 K (= 501 J/g). OK. Misma fuente.
- Acetona, calor específico del líquido: código 2,15 J/(g·K). NIST: 125,45 J/(mol·K) a 298 K (= 2,16). OK.
  NIST, Acetone, Condensed phase — https://webbook.nist.gov/cgi/cbook.cgi?ID=C67641&Units=SI&Mask=2
- Acetona, calor específico del sólido: código 1,6 J/(g·K). NIST: 96 J/(mol·K) a 173 K (= 1,65). OK. Misma fuente.
- Acetona, calor específico del gas: código 1,3 J/(g·K). NIST: 80,6 J/(mol·K) a 332,6 K (= 1,39). Estaba 6 % bajo: corregido a 1,4.
  NIST, Acetone, Gas phase — https://webbook.nist.gov/cgi/cbook.cgi?ID=C67641&Units=SI&Mask=1

## Flotación (`src/labs/flotacion/model.ts`)

- Salmuera: código ρ ≈ 1.000 + 7,4 · %NaCl, hasta 26 %. CRC (20 °C): 3 % → 1,0196; 10 % → 1,0707; 20 % → 1,1478; 22 % → 1,164 g/cm³. El ajuste se aparta ≤ 0,3 %. Saturación a 20 °C: 26,41 %. OK.
  Lide (ed.), *CRC Handbook of Chemistry and Physics*, 86.ª ed., 2005, pp. 8-71 y 8-116, vía Sodium chloride (data page), Wikipedia — https://en.wikipedia.org/wiki/Sodium_chloride_(data_page)
- Huevo: código 1.080 kg/m³. Paper: gravedad específica media 1,087 g/cm³ en una de cuatro líneas de gallinas; método por inmersión en soluciones de NaCl de 1,060 a 1,100. OK.
  "Physical quality of eggs of four strains of poultry", Redalyc — https://www.redalyc.org/journal/3031/303168054052/html/
- Agua 1.000, aceite 920, alcohol 790 kg/m³: Engineering Toolbox (20 °C) da agua pura 1.000 (a 4 °C), aceites de soja, colza y girasol 919–920, etanol 789–790. OK.
  "Liquids - Densities", The Engineering ToolBox — https://www.engineeringtoolbox.com/liquids-densities-d_743.html
- Hielo 917, granito 2.700 y acero 7.850 kg/m³: Engineering Toolbox da hielo 917, granito 2.600–2.800 y acero 7.820. OK.
  "Densities of Solids", The Engineering ToolBox — https://www.engineeringtoolbox.com/density-solids-d_1265.html
- Madera (pino) 500 kg/m³: Engineering Toolbox da pino blanco 350–500, radiata 480, Oregón 530 y silvestre 510. OK.
  "Wood Species - Densities", The Engineering ToolBox — https://www.engineeringtoolbox.com/wood-density-d_40.html
- Plástico (tapita de polietileno) 950 kg/m³: el HDPE es ≥ 0,941 g/cm³ y el LDPE va de 0,910 a 0,940. OK.
  Polyethylene, Wikipedia — https://en.wikipedia.org/wiki/Polyethylene

## Respiratorio (`src/labs/respiratorio/model.ts`)

- VO₂ por actividad: el código usa 1 MET = 3,5 mL/kg/min con 70 kg, y reposo 250, caminar 750 y correr 2.200 mL/min (1, 3 y 9 MET). El Compendium 2024 define 1 MET = 3,5 mL/kg/min, da correr a 6–6,3 mph = 9,3 MET (≈ 2.280 mL/min) y caminar a 2,8–3,4 mph en llano = 3,8 MET (≈ 930 mL/min). Correr OK. Caminar en el código equivale a un paso más lento (≈ 3 MET).
  Herrmann et al., "2024 Adult Compendium of Physical Activities", *Journal of Sport and Health Science*, 2024 — https://pacompendium.com/running/ y https://pacompendium.com/walking/
- PO2_VENOSA = 25 mmHg (parámetro ajustado): la sangre venosa va de 20 a 40 mmHg (40 en reposo, cerca de 20 con esfuerzo). OK, dentro del rango.
  MacIntosh et al., *Open Textbook of Exercise Physiology*, cap. 7, LibreTexts — https://med.libretexts.org/Bookshelves/Sports_and_Exercise/Open_Textbook_of_Exercise_Physiology_(MacIntosh)/02:_The_Fundamentals_of_Exercise_Physiology/2.05:_Chapter_7_-_Pulmonary_Function_Gas_Exchange_Between_the_Environment_and_Blood
- C_CO2 = 30 mL/mmHg (ajustado para que en apnea la PaCO₂ suba ≈ 7 mmHg/min): medido en apnea, sube 12 mmHg el primer minuto y 3,4 mmHg/min después (curva logarítmica). 7 mmHg/min es un promedio lineal razonable para una apnea de 1–2 min. OK como aproximación.
  Stock, Schisler y McSweeney, "The PaCO2 rate of rise in anesthetized patients with airway obstruction", *J Clin Anesth* 1989;1(5):328-32 — https://pubmed.ncbi.nlm.nih.gov/2516732/

## Mezclas (`src/labs/mezclas/datos.ts` y `model.ts`)

- Aceite: densidad 0,92 g/mL. OK (ver flotación: aceites de soja, colza y girasol 0,919–0,920).
- Aceite, ebullición: no hierve, humea y se descompone. Punto de humo: soja 234 °C, maíz 230–238, canola 204–230 y girasol refinado 252–254. Antes el código decía 300 °C y el texto lo mostraba como ebullición; corregido: `tEbullicion: Infinity`, `humo: 230`, y el texto dice "no hierve: humea y se quema a ~230 °C".
  Smoke point, Wikipedia — https://en.wikipedia.org/wiki/Smoke_point
- Sal (NaCl): densidad 2,16 g/cm³, ebullición 1.413 °C y solubilidad 36 g/100 mL. Wikipedia da 2,17 g/cm³, 1.413 °C y 360 g/L a 25 °C. OK.
  Sodium chloride, Wikipedia — https://en.wikipedia.org/wiki/Sodium_chloride
- Sal fina, grano 0,4 mm: las sales finas de mesa van de 0,3 a 0,6 mm y la sal para conservas ronda 0,5 mm. OK.
  "Salt, the Only Rock We Eat!", UC Master Food Preserver Program (UC ANR), mayo 2025 — https://ucanr.edu/program/uc-master-food-preserver-program/article/salt-only-rock-we-eat-may-2025
- Arena gruesa, grano 0,8 mm: la escala de Wentworth define arena gruesa entre 0,5 y 1 mm. OK.
  Grain size, Wikipedia — https://en.wikipedia.org/wiki/Grain_size
- Arena (SiO₂): densidad 2,65 g/cm³. Wikipedia da 2,648 g/cm³ (cuarzo α). OK. Ebullición: Wikipedia da 2.950 °C; el código decía 2.230 (corregido a 2.950). No cambiaba nada en la simulación (el mechero llega a 300 °C).
  Silicon dioxide, Wikipedia — https://en.wikipedia.org/wiki/Silicon_dioxide
- Hierro: densidad 7,87 g/cm³ y ebullición 2.862 °C. Wikipedia da 7,874 g/cm³ y 2.861 °C. OK.
  Iron, Wikipedia — https://en.wikipedia.org/wiki/Iron
- Limaduras de hierro, 0,15 mm: equivale a malla 100 (0,149 mm). Las limaduras escolares que se venden son de malla 40 (≤ 0,42 mm). Es un valor posible, en el extremo fino.
  Tabla de conversión de tamaños de partículas, Sigma-Aldrich — https://www.sigmaaldrich.com/US/en/support/calculators-and-apps/particle-size-conversion-table
  "Iron Filings, 40 mesh", The Science Company — https://www.sciencecompany.com/Iron-Filings-40-mesh-500g-P6370
- Radio de gota de aceite al agitar, 0,25 mm (`RADIO_GOTA_M`): parámetro de orden de magnitud, sin fuente directa. Sin verificar.

## Luna (`src/labs/luna/model.ts`)

- Mes sinódico 29,530588, sideral 27,321662 y dracónico 27,212221 días. *Explanatory Supplement* (1961), vía Wikipedia: 29,530588861, 27,321661554 y 27,212220815 (dracónico: "draconitic"). NASA: sinódico 29,53 y revolución 27,3217. OK.
  "Lunar month", Wikipedia — https://en.wikipedia.org/wiki/Lunar_month
  NASA NSSDCA, Moon Fact Sheet — https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
- Inclinación de la órbita 5,145°, distancia 384.400 km, radio 1.737,4 km: NASA da 5,145° respecto de la eclíptica, semieje 0,3844 × 10⁶ km y radio volumétrico medio 1.737,4 km. OK. Misma fuente (Moon Fact Sheet).
- Radio de la umbra a la distancia de la Luna, 4.600 km (= 9.200 de diámetro): OSU da un ancho de 9.000 km, ≈ 2,6 diámetros lunares. OK (2 %).
  Pogge, "Lecture 9: Eclipses of the Sun & Moon", Astronomy 161, Ohio State University — https://www.astronomy.ohio-state.edu/pogge.1/Ast161/Unit2/eclipses.html
- `ARGUMENTO_INICIAL` (14,7): parámetro elegido para que el primer eclipse caiga en la 6.ª Luna llena. No es un dato.

## Estaciones (`src/labs/estaciones/model.ts`)

- Inclinación del eje 23,44°, excentricidad 0,0167 y semieje 149,6 × 10⁶ km: NASA da 23,44°, 0,0167 y 149,598. OK. Año de 365,25 días: NASA da 365,242 (trópico); el redondeo es una simplificación.
  NASA NSSDCA, Earth Fact Sheet — https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
- Longitud del perihelio 282,94° (vista desde la Tierra): NASA da 102,94719° heliocéntrica; + 180° = 282,947°. OK. Misma fuente.
- Perihelio ~3 de enero (día 2 desde el 1 de enero): 4 ene 2025, 3 ene 2026, 3 ene 2027. OK.
  "Apsis", Wikipedia (tabla de perihelios y afelios) — https://en.wikipedia.org/wiki/Apsis
- Ciudades: Buenos Aires −34,6 / −58,4; Ushuaia −54,8 / −68,3; Madrid 40,4 / −3,7. Wikipedia: −34,604 / −58,381; −54,807 / −68,308; 40,417 / −3,703. OK. "Ecuador" es un punto sobre el ecuador (lat 0) a la longitud de Quito.
  Buenos Aires, Ushuaia y Madrid, Wikipedia — https://en.wikipedia.org/wiki/Buenos_Aires
