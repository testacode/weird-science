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

- Gravedad: Tierra 9,8, Marte 3,71 y Luna 1,62 m/s². NASA da Tierra 9,82, Marte 3,73 (media; 3,71 es el valor ecuatorial) y Luna 1,62. OK.
  NASA NSSDCA, Planetary Fact Sheets (Earth, Mars, Moon) — https://nssdc.gsfc.nasa.gov/planetary/factsheet/

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

## Circuito (`src/labs/circuito/model.ts`)

- Pila de 1,5 V por celda; resistencia interna de 3 pilas grandes en serie, 0,5 Ω: la hoja de datos de Energizer E95 (pila D, LR20) da 1,5 V y 173 mΩ nueva, así que 3 en serie suman 0,52 Ω. OK. El modelo usa 0,5 Ω para cualquier voltaje (simplificación).
  Energizer E95, hoja de datos (versión distribuida por RS) — https://assets.rs-online.com/v1698850014/Datasheets/fd367a14d9214aa9c2d082888803f824.pdf
- Lamparita de 4,5 V y 15 Ω (0,3 A, 1,35 W): es la E10 de 4,5 V / 0,3 A / 1,35 W de los kits escolares. OK. Que la resistencia sea constante es una simplificación (el filamento frío tiene menos).
  Ficha de producto "E10 4.5V / 0.3A 1.35W", Amazon — https://www.amazon.com/Miniature-Screw-Light-1-35W-Flashlight/dp/B076MGGHKS
- `BRILLO_PELIGRO` (1,5 veces el normal) y `R_CABLE` (0,05 Ω): parámetros del modelo, no datos.

## Fotosíntesis (`src/labs/fotosintesis/model.ts`)

- 6 O₂ por glucosa (6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂) y masa molar de la glucosa 180,16 g/mol: NIST da C6H12O6 y 180,1559. OK.
  NIST Chemistry WebBook, Glucose — https://webbook.nist.gov/cgi/cbook.cgi?ID=C50997&Units=SI
- Absorción de la luz verde, 12 % (blanca 75 %, roja 90 %, azul 95 %). **No coincide**: medida en hojas de lechuga, la absorción de la luz verde es 81,1 % (mínimo 69,8 % a 551 nm), la azul 91,6 % y la roja 92,6 %. El 12 % se parece a la clorofila extraída en solución, no a una hoja. Terashima et al. (2009) muestran además que, con luz fuerte, la verde rinde más que la roja porque entra más profundo en la hoja. Elodea tiene hojas finas (absorberá menos que la lechuga), pero no encontré un valor medido. Corregido (decisión 2026-10-01): verde 0,12 → 0,7 y blanca 0,75 → 0,8 (estimaciones para una hoja fina); roja y azul quedan en 0,9 y 0,95. Los textos ya no dicen que la hoja "rebota" el verde.
  Liu y van Iersel, "Photosynthetic Physiology of Blue, Green, and Red Light: Light Intensity Effects and Underlying Mechanisms", *Frontiers in Plant Science* 12, 2021 — https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2021.619987/full
  Terashima et al., "Green light drives leaf photosynthesis more efficiently than red light in strong white light", *Plant Cell Physiol* 2009;50(4):684-97 — https://pubmed.ncbi.nlm.nih.gov/19246458/
- `P_MAX`, `RESPIRACION`, `IK`, `KC`, `T_OPT` (28 °C), `T_ANCHO`, `Q10` (2) y `UMOL_POR_BURBUJA` (0,17 µmol ≈ una burbuja de ~4 µL): parámetros del modelo, de orden de magnitud. Sin verificar.

## Digestivo (`src/labs/digestivo/model.ts` y `contenido.ts`)

- kcal por gramo 4 / 4 / 9 (carbohidratos, proteínas, grasas): factores de Atwater. OK.
  "Atwater system", Wikipedia — https://en.wikipedia.org/wiki/Atwater_system
- pH por tramo, boca 6,8 / estómago 2 / delgado 7,5 / grueso 6,5: Fallingborg da el estómago muy ácido, el delgado de 6 (duodeno) a 7,4 (íleon terminal) y el colon de 5,7 (ciego) a 6,7 (recto). La saliva ronda pH 6–7. OK (el 7,5 del delgado es el extremo alto).
  Fallingborg, "Intraluminal pH of the human gastrointestinal tract", *Dan Med Bull* 1999;46(3):183-96 — https://pubmed.ncbi.nlm.nih.gov/10421978/
  "Saliva", Wikipedia — https://en.wikipedia.org/wiki/Saliva
- Tiempos de tránsito, estómago 3 h / delgado 4 h / grueso 16 h: Wikipedia da que el estómago se vacía a las 4–5 h, el delgado tarda 4 h en promedio y el colon 30–40 h. Delgado OK; estómago algo corto; grueso dentro del rango que declara el lab (12–36 h) pero bajo respecto del promedio. Simplificación (el lab acelera el reloj).
  "Human digestive system", Wikipedia — https://en.wikipedia.org/wiki/Human_digestive_system
- Largo del tubo, "casi 9 m": unos 9 m en autopsia. OK.
  "Gastrointestinal tract", Wikipedia — https://en.wikipedia.org/wiki/Gastrointestinal_tract
- Comidas (pan, milanesa, papas fritas, en gramos de cada macronutriente) y `FACTOR_SIN_BILIS`, `PH_CON_ANTIACIDO`: porciones aproximadas y parámetros del modelo. Sin verificar.

## Ciclo del agua (`src/labs/ciclo-agua/model.ts`)

- Todas las constantes (`K_*`, `CAP_REF`, `S_MAX`, `T_BASE`, `T_SOL`, `DT_MONTANA`) son parámetros de un modelo de compartimentos con agua total fija (100 mm), elegidos para que el ciclo se vea en días. No representan un lugar real; no hay datos que verificar. El lab no lleva sección de fuentes.

## Respiratorio, segunda pasada

- Vapor de agua en las vías aéreas, 47 mmHg: presión de vapor saturado a temperatura corporal = 47 mmHg. OK.
  "Alveolar gas equation", Wikipedia — https://en.wikipedia.org/wiki/Alveolar_gas_equation
- Coeficiente de Hill de la hemoglobina, 2,7: el rango citado es 1,7–3,2. OK.
  "Hill equation (biochemistry)", Wikipedia — https://en.wikipedia.org/wiki/Hill_equation_(biochemistry)
- CO₂ exhalado ≈ 4 %: el aire exhalado tiene 4–5 % de CO₂. OK.
  "Breathing", Wikipedia — https://en.wikipedia.org/wiki/Breathing
- O₂ del aire 20,93 % (`FIO2`) y CO₂ 0,04 % (`FICO2`): Wikipedia da 20,946 % de O₂ y 0,0412–0,0424 % de CO₂. OK.
  "Atmosphere of Earth", Wikipedia — https://en.wikipedia.org/wiki/Atmosphere_of_Earth
- Presión con la altura, Pb = 760 · (1 − 2,25577·10⁻⁵ · h)^5,25588: exponente 5,25588 de la capa 0 de la atmósfera estándar; 2,25577·10⁻⁵ = 0,0065 K/m ÷ 288,15 K. OK.
  "Barometric formula", Wikipedia — https://en.wikipedia.org/wiki/Barometric_formula
- O₂ exhalado ≈ 16 %: derivado de datos verificados. Con cociente respiratorio 0,8, si el CO₂ sube 4 puntos (4–5 % exhalado, verificado) el O₂ baja 4 / 0,8 = 5 puntos: 21 − 5 = 16 %. OK.
- P50 = 26,8 mmHg: sin fuente verificada en navegador tras 5 intentos (las búsquedas dicen 26,5–27). Declarado en el lab como "valor de libro".

## Datos pendientes, segunda pasada

- Digestivo, pan 50 / 9 / 3 g (carbohidratos / proteínas / grasas): USDA "Bread, white, commercially prepared" da 49,4 / 8,85 / 3,33 g cada 100 g. OK (porción de 100 g).
  USDA FoodData Central #174924 — https://fdc.nal.usda.gov/food-details/174924/nutrients
- Digestivo, papas fritas 40 / 4 / 17 g: USDA "McDONALD'S, french fries" da 42,6 / 3,41 / 15,5 g cada 100 g. OK (porción de 100 g).
  USDA FoodData Central #170721 — https://fdc.nal.usda.gov/food-details/170721/nutrients
- Digestivo, milanesa 15 / 30 / 18 g: no está en USDA (2 búsquedas). Declarada en el lab como porción aproximada.
- Fotosíntesis, absorción de Elodea: sin valor medido. Declarada en el lab como estimación a partir de otras hojas.

## Imanes (`src/labs/imanes/model.ts`)

Consultas en navegador real (agent-browser, Chromium headless) el 2026-10-01, hechas por el agente del lab.

- Temperaturas de Curie: ferrita 450 °C, neodimio 340 °C. Wikipedia: hierro 770 °C, cobalto 1.130 °C, níquel 354 °C, ferrita de estroncio 450 °C; neodimio 310–400 °C en "Curie temperature" y 310–370 °C en "Neodymium magnet" (340 cae dentro de las dos). OK.
  "Curie temperature", Wikipedia — https://en.wikipedia.org/wiki/Curie_temperature
- Magnetización con la temperatura, m = tanh(m·Tc/T) (Weiss): forma ilustrativa; los imanes reales se apartan.
- Remanencia: neodimio 1,3 T (Wikipedia 1–1,5 T), ferrita 0,35 T (campo máximo ≈ 0,35 T). Neodimio de grado estándar: uso máximo 80 °C. OK.
  "Neodymium magnet", Wikipedia — https://en.wikipedia.org/wiki/Neodymium_magnet
  "Ferrite magnet", Wikipedia — https://en.wikipedia.org/wiki/Ferrite_magnet
- Fuerza entre imanes de barra por modelo de polos (suma de 4 pares, suavizado 0,5 cm); lejos decae como 1/d⁴. Orden de magnitud: neodimio a 0,5 cm da 95 N, debajo del tope B²A/(2μ0) ≈ 170 N. OK.
  "Force between magnets", Wikipedia — https://en.wikipedia.org/wiki/Force_between_magnets
  "Magnetic dipole–dipole interaction", Wikipedia — https://en.wikipedia.org/wiki/Magnetic_dipole%E2%80%93dipole_interaction
- Susceptibilidad (SI): aluminio +2,2×10⁻⁵, cobre −9,63×10⁻⁶, PVC −1,071×10⁻⁵, níquel 600, hierro 200.000; densidades hierro 7,874, aluminio 2,70, cobre 8,92, níquel 8,9, PVC 1,372 g/cm³. OK.
  "Magnetic susceptibility", Wikipedia — https://en.wikipedia.org/wiki/Magnetic_susceptibility
- Cobalto, densidad 8,834 g/cm³ a 20 °C, de la página "Cobalt" (el valor de libro ronda 8,90; no verificado). OK. — "Cobalt", Wikipedia — https://en.wikipedia.org/wiki/Cobalt
- Acero 7,85 g/cm³: ver Flotación.
- Factor desmagnetizante 1/3 (cubo por simetría) y saturación 1,6 T (aleaciones de hierro 1,6–2,2 T). OK.
  "Demagnetizing field" y "Saturation (magnetic)", Wikipedia — https://en.wikipedia.org/wiki/Demagnetizing_field
- Hierro, níquel y cobalto ferromagnéticos; un imán partido da dos imanes con N y S. OK. — "Magnet", Wikipedia — https://en.wikipedia.org/wiki/Magnet
- Latas de bebida: 75 % aluminio, 25 % acero estañado. OK. — "Beverage can", Wikipedia — https://en.wikipedia.org/wiki/Beverage_can
- Campo terrestre 30.000–60.000 nT; el código usa 20 µT de componente horizontal (parámetro). — "Earth's magnetic field", Wikipedia — https://en.wikipedia.org/wiki/Earth%27s_magnetic_field
- Sin verificar: susceptibilidad del cobalto (250) y del acero (1.000) (no cambian el resultado: la forma limita a 3); que un imán desmagnetizado siga siendo atraído (el modelo da 0, avisado); pérdida irreversible del neodimio desde 80 °C no modelada (avisado).
- Suavizado del polo 0,65 cm (antes 0,5): parámetro ajustado. El polo real es una cara de 1,6 cm; se ajustó contra la fuerza entre dos caras cuadradas de 1,6 cm con carga uniforme (integración numérica, error medio ~10 %; a 0,5 cm ~4,3 N contra ~4,5 N).
- Parámetros del modelo: campo de alineación de limaduras 1 mT, rozamiento 0,3, tamaños de imán y muestra.

## Sonido (`src/labs/sonido/model.ts`)

Consultas en navegador real (agent-browser, Chromium headless) el 2026-10-01, hechas por el agente del lab.

- Velocidad del sonido: aire a 20 °C 343 m/s; agua dulce a 20 °C 1.481 m/s. OK. Fórmula de fluidos v = √(K/ρ). OK. En un gas ideal c no depende de la presión (sostiene que en el vacío p baja con ρ). OK.
- Acero como barra: 5.050 m/s = √(E/ρ) con E = 200 GPa (A36) y ρ = 7.850; vale para varillas con diámetro menor que la longitud de onda. En masa, la tabla da 5.596–5.912 m/s (el lab lo declara). OK.
  "Young's modulus", Wikipedia — https://en.wikipedia.org/wiki/Young%27s_modulus
  "Speed of sound", Wikipedia — https://en.wikipedia.org/wiki/Speed_of_sound
- Densidad del acero 7.850 kg/m³ (tabla 7.787–7.965). OK.
- Densidad del aire 1,204 kg/m³ a 20 °C, z0 = 413,3 Pa·s/m, p/v = ±ρc. OK. — "Acoustic impedance", Wikipedia — https://en.wikipedia.org/wiki/Acoustic_impedance
- Densidad del agua 998,2 kg/m³ a 20 °C. OK. — "Water (data page)", Wikipedia — https://en.wikipedia.org/wiki/Water_(data_page)
- Rango audible 20–20.000 Hz. OK. — "Hearing range", Wikipedia — https://en.wikipedia.org/wiki/Hearing_range
- 20 µPa = 0 dB y 1 Pa ≈ 94 dB. OK. — "Sound pressure", Wikipedia — https://en.wikipedia.org/wiki/Sound_pressure
- Conversación 60–70 dBA; daño con exposición ≥ 85 dBA. OK.
  NIDCD, Noise-Induced Hearing Loss — https://www.nidcd.nih.gov/health/noise-induced-hearing-loss
  NIOSH, Noise and hearing loss — https://www.cdc.gov/niosh/noise/about/index.html
- El sonido no se propaga en el vacío; campana de vacío con el despertador que se apaga. OK.
  "Sound", Wikipedia — https://en.wikipedia.org/wiki/Sound
  "Bell jar", Wikipedia — https://en.wikipedia.org/wiki/Bell_jar
- Presión mínima de la bomba 0,1 Pa (rotativa de varias etapas, 10⁻⁶ bar). OK como bomba de laboratorio; la campana de aula no llega (no verificado). — "Rotary vane pump", Wikipedia — https://en.wikipedia.org/wiki/Rotary_vane_pump
- La4 = 440 Hz y Do4 = 261,6256 Hz. OK. — "A440 (pitch standard)" y "Piano key frequencies", Wikipedia — https://en.wikipedia.org/wiki/A440_(pitch_standard)
- Derivado: el agua es ≈ 15.000 veces más difícil de comprimir que el aire = (1481/343)² · (998,2/1,204); desplazamiento < 1 µm a 80 dB y 440 Hz (p = Zv, Z = 413).
- Sin verificar o parámetros: presión de una campana de aula; tiempos y escalas de visualización (`TAU_BOMBA`, `TAU_ENTRADA`, `PULSO_S`, `F_VISUAL`); desplazamiento de partículas (derivado con p = Zv); límites grave/medio/agudo (criterio de redacción).

## Circulatorio (`src/labs/circulatorio/model.ts`)

Consultas en navegador real (agent-browser, Chromium headless) el 2026-10-01, hechas por el agente del lab.

- Gasto cardíaco, FC y VS en reposo: código 70 /min, 70 mL, 4,9 L/min. Wikipedia: ≈ 5 L/min con 70 /min y VS ≈ 70 mL (rango 4–8 L/min); por RM (Maceira 2006) VFD 142, VFS 47–50, VS ≈ 90–95 mL. OK (70/70 es el set de libro; el 90 se nombra en el lab).
  "Cardiac output", Wikipedia — https://en.wikipedia.org/wiki/Cardiac_output
  "Stroke volume", Wikipedia — https://en.wikipedia.org/wiki/Stroke_volume
- VFS = 50 mL. OK. FC en reposo 60–100 /min y máxima ≈ 220 − edad; `FC_MAXIMA` = 190 (30 años, ajuste).
  "Heart rate", Wikipedia — https://en.wikipedia.org/wiki/Heart_rate
- Ciclo de 0,8 s a 70–75 /min, sístole 0,3 s y diástole 0,5 s. OK. La sístole a otras frecuencias (0,3 · √(RR/0,8)) es un ajuste propio.
  "Cardiac cycle", Wikipedia — https://en.wikipedia.org/wiki/Cardiac_cycle
- Fick, 1,34 mL O₂/g Hb, Hb 150 g/L, SaO₂ 98 % → 197 mL/L; venosa mixta ≈ 75 %. Saturación arterial 96–100 %, venosa 60–80 %. OK.
  "Fick principle", Wikipedia — https://en.wikipedia.org/wiki/Fick_principle
  "Oxygen saturation (medicine)", Wikipedia — https://en.wikipedia.org/wiki/Oxygen_saturation_(medicine)
- Extracción máxima 0,89 (venosa mixta ≈ 22 de 200 mL/L en el pico); gasto máximo 20–25 L/min y VO₂ máx 3,0–3,5 L/min en un joven típico; código 22,5 L/min y 3.250 mL/min. OK.
  Magder, "Mechanical Limits of Cardiac Output at Maximal Aerobic Exercise", IntechOpen, 2022 — https://www.intechopen.com/chapters/81078
- `BOMBEO_MAXIMO` = 25 L/min (lo máximo que bombea el ventrículo; aviso "el corazón no da más"): mismo límite de llenado ≈ 25 L/min. OK. Misma fuente (Magder 2022).
- Volumen de sangre ≈ 5 L. OK. — "Blood volume", Wikipedia — https://en.wikipedia.org/wiki/Blood_volume
- VO₂ por actividad: ver Respiratorio (Compendium 2024).
- Insuficiencia mitral por fracción regurgitante: leve < 20 %, moderada 20–40 %, moderada a grave 40–60 %, grave > 60 %. OK. La compensación (el ventrículo expulsa VS / (1 − FR) para que al cuerpo llegue lo mismo) sale de la definición de fracción regurgitante.
  "Mitral valve regurgitation", Wikipedia — https://en.wikipedia.org/wiki/Mitral_valve_regurgitation
- CIV: cortocircuito izquierda → derecha (VI ≈ 120 mmHg, VD ≈ 20); Qp/Qs pequeña < 1,5:1, moderada 1,5–3:1, grande > 3:1; Eisenmenger invierte el paso. OK. El modelo conserva el flujo al cuerpo (Qs) y sube Qp = Qs / (1 − f), coherente con las fuentes. El mapeo de la gravedad (20–70 %) es parámetro del modelo.
  "Ventricular septal defect", Wikipedia — https://en.wikipedia.org/wiki/Ventricular_septal_defect
  "Left-to-Right Shunts", UTMB — https://www.utmb.edu/pedi_ed/CoreV2/Cardiology/Cardiology8.html
  Bradley, "Ventricular Septal Defects (VSD)", STS — https://ebook.sts.org/sts/view/Cardiac-and-Congenital/1864080/all/Ventricular_Septal_Defects__VSD_
- Sangre roja viva con O₂ y oscura sin O₂; las venas se ven azules por la piel; el lab dibuja azul por convención y lo aclara. — "Blood", Wikipedia — https://en.wikipedia.org/wiki/Blood
- Sin verificar o ajustes: duración de la sístole a otras frecuencias, valores típicos por actividad (interpolación), mapeo gravedad → fuga/paso, velocidad de las partículas, τ de mezcla = 5 L / Qs (modelo propio con datos verificados).

## Luz (`src/labs/luz/model.ts`)

Consultas en navegador real (agent-browser, Chromium headless) el 2026-10-01, hechas por el agente del lab. Todos los índices a 589,3 nm.

- Agua 1,3333: Daimon y Masumura 2007, agua destilada a 20,0 °C, 1,3333 a 589,3 nm (1,3334 a 587,6 nm; 1,3317 a 650 nm). OK. — RefractiveIndex.INFO, H2O, Daimon-20.0C — https://refractiveindex.info/?shelf=main&book=H2O&page=Daimon-20.0C
- Vidrio común 1,5233: Rubin 1985, soda-lime transparente, 1,5233. OK (control: N-BK7 1,5167). — RefractiveIndex.INFO, Soda lime glass, Rubin-clear — https://refractiveindex.info/?shelf=glass&book=soda-lime&page=Rubin-clear
- Diamante 2,4173: Peter 1923. OK. — RefractiveIndex.INFO, C, Peter — https://refractiveindex.info/?shelf=main&book=C&page=Peter
- Aire 1,000277: Ciddor 1996, aire estándar, 1,00027715. OK. — RefractiveIndex.INFO, Air, Ciddor — https://refractiveindex.info/?shelf=other&book=air&page=Ciddor
- Aceite de oliva 1,469: Wikipedia 1,4677–1,4705 (sin λ ni temperatura). Aproximado, una sola fuente. — "Olive oil", Wikipedia — https://en.wikipedia.org/wiki/Olive_oil
- Velocidad de la luz 299.792.458 m/s (exacta). OK. — NIST CODATA — https://physics.nist.gov/cgi-bin/cuu/Value?c
- Ángulo crítico (sale de los n): agua 48,6°, aceite 42,9°, vidrio 41,0° (n = 1,5233), diamante 24,4°. Wikipedia: 48,6° agua–aire; ~49° agua y ~42° vidrio con n ≈ 1,5. El 41,0° es cálculo del modelo. OK.
  "Snell's law" y "Total internal reflection", Wikipedia — https://en.wikipedia.org/wiki/Total_internal_reflection
- Fresnel sin polarizar a incidencia normal: aire–agua 2,0 %, aire–vidrio 4,3 %, aire–diamante 17 %; Wikipedia ~4 % para vidrio n ≈ 1,5. OK. — "Fresnel equations", Wikipedia — https://en.wikipedia.org/wiki/Fresnel_equations
- Ley de la reflexión. OK. El giro del rayo = 2 × giro del espejo sale del modelo vectorial. — "Reflection (physics)", Wikipedia — https://en.wikipedia.org/wiki/Reflection_(physics)
- Profundidad aparente: desde arriba aparente/real = n_aire/n_agua (0,75), tiende a cero al mirar rasante. OK. La fórmula de costado d · tan β / tan α es derivación propia con la ley de Snell (no está en la fuente). — "Refraction", Wikipedia — https://en.wikipedia.org/wiki/Refraction
- Parámetros: rango del medio inventado (1,00–2,50), medidas de pecera y lápiz, distancia del ojo, láser adentro en crítico + 11°, `TOLERANCIA_IGUAL` 1 %, umbral "una parte sale" 25 %, vara de "bastante más cerca" 2/3, margen del ojo a la pared (`ojoMax`). Se ignora la dispersión.

## Célula y ósmosis (`src/labs/celula/constantes.ts` y `model.ts`)

Consultas en navegador real (agent-browser, Chromium headless) el 2026-10-01, hechas por el agente del lab.

- Suero 0,9 % NaCl, 58,44 g/mol, coeficiente osmótico 0,93: 9 g/L = 154 mmol/L, 308 mOsm/L calculados y 286,4 mOsm/L con φ (≈ sangre 285). El código da 286,4. OK.
  "Saline (medicine)", Wikipedia — https://en.wikipedia.org/wiki/Saline_(medicine)
- Interior del glóbulo 286 mOsm/L: plasma humano 275–299 mOsm/kg. OK. — "Plasma osmolality", Wikipedia — https://en.wikipedia.org/wiki/Plasma_osmolality
- Glóbulo rojo: volumen 90 fL, esfera de 150 fL sin distender la membrana (superficie 136 µm² → 149 fL), rotura en 150/90 = 1,67×. OK. — "Red blood cell", Wikipedia — https://en.wikipedia.org/wiki/Red_blood_cell
- Fracción osmóticamente inactiva ≈ 0,5. OK. — Denysova y Nitsche, *J Theor Biol* 2022 — https://europepmc.org/article/MED/35051431
- `K_AGUA_GLOBULO` 1,8 (ajustado): en agua pura rompe a los 0,62 s; la fuente da ≈ 0,6 s. OK (calibrado). — Anderson y Lovrien, *Biophys J* 1977 — https://europepmc.org/article/MED/911981
- Rotura en la esfera (1,67×); alternativas publicadas: 6–12 % por encima de la esfera (Massaldi 1988) o 1,25× (Yang y Kamino 1995). Estimación declarada.
  Massaldi et al., *Biophys J* 1988 — https://europepmc.org/article/MED/3207827
  Yang y Kamino, *Jpn J Physiol* 1995 — https://europepmc.org/article/MED/8713172
- Urea isoosmolar pero hipotónica para el glóbulo; plasmólisis con pared intacta. OK. — "Tonicity", Wikipedia — https://en.wikipedia.org/wiki/Tonicity
- Plasmólisis con sal o sacarosa en Elodea o cebolla; la pared evita que estalle; presión de pared ≈ 0 plasmolizada. OK.
  "Plasmolysis" y "Water potential", Wikipedia — https://en.wikipedia.org/wiki/Plasmolysis
- Van't Hoff π = i·c·R·T, `PI0_VEGETAL_MPA` 0,91 MPa a 20 °C. OK. — "Osmotic pressure", Wikipedia — https://en.wikipedia.org/wiki/Osmotic_pressure
- Sin verificar o parámetros: borde de plasmólisis de la cebolla 1,17 % (fuente bloqueada), `RIGIDEZ_PARED` 11 (orden de magnitud), `K_AGUA_VEGETAL`, `K_SOLUTO`, ritmos, rotura del protoplasto sin pared en 1,67× (supuesto), cantidades de partículas de la maqueta.
