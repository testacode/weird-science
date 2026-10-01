// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).
import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { numero } from '../../ui/formato'
import { listaAtajos } from '../../ui/teclado'
import { V_ROTURA } from './constantes'
import { conPared, type Entorno, type Lectura } from './model'
import { ATAJOS } from './teclado'

export const GANCHO = `El agua cruza la membrana de una célula hacia donde hay más <span class="c-ambar">sal</span>. En un vaso con agua, ¿se hincha, se arruga o estalla? Depende de la sal${av(' y de si la célula tiene pared')}.`

const mosm = (n: number) => `${numero(n, 0)} mOsm/L`

/** Relato en vivo: lo que está pasando ahora con la célula y por qué. */
export function relato(ent: Entorno, l: Lectura): string {
  const vegetal = ent.celula === 'vegetal'
  const sal = ent.selectiva ? '' : ' La membrana no es selectiva: la <span class="c-ambar">sal</span> la atraviesa y se reparte igual a los dos lados.'
  const cifras = av(` (afuera ${mosm(l.mOsmFuera)}, adentro ${mosm(l.mOsmDentro)})`)
  if (l.rota)
    return vegetal
      ? `<strong>Estalló.</strong> Sin pared nada frena al agua: el protoplasto se hinchó hasta pasar el límite de la membrana${av(` (${numero(V_ROTURA, 2)}× su volumen)`)}.${sal}`
      : `<strong>Hemólisis.</strong> El agua entró hasta pasar el límite de la membrana${av(` (${numero(V_ROTURA, 2)}× el volumen normal)`)}: el glóbulo estalló y soltó su <span class="c-magenta">hemoglobina</span>, que tiñe el líquido.${sal}`
  if (!ent.selectiva)
    return `<strong>Membrana sin selección.</strong> La <span class="c-ambar">sal</span> entra y sale libre, así que solo cuentan las moléculas grandes de adentro, que no pasan: el agua entra tras ellas${conPared(ent) ? ' hasta que la pared empuja de vuelta y la frena' : ' y la célula se hincha sin freno'}.`
  const fin = l.listo
  if (l.forma === 'hincha' || l.flujo > 0.02)
    return vegetal && conPared(ent)
      ? `<strong>Hipotónica${fin ? ': turgente' : ''}.</strong> Afuera hay menos sal${cifras}, entra agua y la membrana empuja contra la pared, que devuelve ${numero(l.presion, 2)} MPa${av(' (presión de turgencia)')}. ${fin ? 'Con esa presión el agua deja de entrar: no estalla.' : ''}`
      : `<strong>Hipotónica${fin ? '' : ': el agua entra'}.</strong> Afuera hay menos sal${cifras}: el agua va hacia adentro${l.forma === 'hincha' ? ` y la célula se hincha, ahora ${numero(l.v, 2)}×` : ''}.${fin ? ' Llegó al equilibrio antes de romperse.' : ''}`
  if (l.forma === 'achica' || l.flujo < -0.02)
    return `<strong>Hipertónica${fin ? '' : ': el agua sale'}.</strong> Afuera hay más sal${cifras}: el agua sale y la sal no entra. ${l.forma !== 'achica' ? '' : vegetal ? `La pared no se achica y la membrana se despega: <b>plasmólisis</b> (${numero(l.v, 2)}×).` : `El glóbulo se achica a ${numero(l.v, 2)}× y se arruga con pinchos: <b>crenación</b>.`}`
  return `<strong>Isotónica.</strong> Adentro y afuera hay la misma concentración${cifras}: el agua cruza en los dos sentidos al mismo ritmo y la célula no cambia${vegetal ? ' (sin presión de la pared)' : ''}.`
}

export const AYUDA_ATAJOS = `
  <h2>Atajos de teclado</h2>
  <p>Funcionan en cualquier momento, salvo mientras escribís en un campo de texto.</p>
  ${listaAtajos(Object.values(ATAJOS))}`

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>La membrana de una célula deja pasar el agua pero casi nada de lo que está disuelto. Entonces el agua se mueve hacia el lado con más soluto, hasta que las concentraciones se emparejan: eso es la <b>ósmosis</b>.${av(' Es una propiedad coligativa: depende de cuántas partículas hay, no de cuáles son (π = i · c · R · T).')}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Las bolitas <span class="c-cielo">celestes</span> son agua, las <span class="c-ambar">ámbar</span> son sal y las <span class="c-magenta">rosas</span> son hemoglobina y otras moléculas grandes de adentro, que no pueden salir.</li>
    <li>El agua cruza la membrana en los dos sentidos todo el tiempo. Lo que importa es el neto: si entran más de las que salen, la célula se hincha.</li>
    <li>El gráfico muestra la concentración de adentro y de afuera: el agua se mueve hasta acercarlas. La pared de la célula vegetal frena el agua antes de que lleguen a igualarse.</li>
    <li>Con 0,9 % de NaCl el glóbulo no cambia: es la solución <b>isotónica</b>, con la misma osmolaridad que la sangre. Más diluida es <b>hipotónica</b>; más concentrada, <b>hipertónica</b>.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Célula:</b> glóbulo rojo (animal, sin pared) o célula vegetal (con pared de celulosa).</li>
    <li><b>Solución:</b> los botones eligen una solución típica para esa célula; el deslizador la ajusta entre 0 y 4 % de sal. Mientras la célula siga entera, al moverlo ves cómo reacciona al instante.</li>
    <li><b>Velocidad:</b> el glóbulo real tarda unos 0,6 s en estallar en agua pura; acá se muestra en cámara lenta.</li>
  </ul>
  <h3>Romper el sistema</h3>
  <ul>
    <li><b>Pared celular (vegetal):</b> sin pared, la célula vegetal se comporta como el glóbulo rojo: en agua pura se hincha y estalla. La pared es lo que la salva.</li>
    <li><b>Membrana selectiva:</b> si la sal atraviesa la membrana, la diferencia de sal desaparece y solo cuentan las moléculas grandes de adentro, que no pasan: el agua entra sin parar y la célula estalla aunque la solución sea isotónica. Es un caso imaginario con sal; con <b>urea</b> pasa de verdad con los glóbulos rojos: la urea sí atraviesa su membrana y una solución de urea con la misma osmolaridad que la sangre los revienta. Por eso lo que importa es la <b>tonicidad</b>, no la osmolaridad.</li>
  </ul>
  <h3>Atajos de teclado</h3>
  ${listaAtajos(Object.values(ATAJOS))}
  <h3>Predecí antes de correr</h3>
  <p>Cada vez que arrancás con una célula nueva, el lab te pregunta qué va a pasar. Elegí, dejá correr y al final se revela si acertaste. Si movés el deslizador, la pregunta se descarta.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> el suero fisiológico de 0,9 % de NaCl es casi isotónico con la sangre; el glóbulo rojo normal mide unos 90 fL y su membrana, sin estirarse, solo da para una esfera de 150 fL (1,67×); en agua pura tarda unos 0,6 s en romperse; la pared de la célula vegetal frena el agua y evita que estalle; con mucha sal la membrana se despega de la pared (plasmólisis); y una solución de urea isoosmolar revienta a los glóbulos aunque tenga la misma osmolaridad.</p>
  <p><b>Simplificado:</b> una sola sal (NaCl, coeficiente osmótico 0,93 constante) y a temperatura fija. La célula no regula su volumen (no hay bombas) y el volumen de rotura se toma como la esfera de 150 fL; otros trabajos miden la rotura algo antes o algo después, y cada glóbulo real tiene la suya. De cada célula solo se modela un volumen: el dibujo (disco, pinchos, caja) es ilustrativo. La velocidad del agua es un parámetro de ajuste: en el glóbulo se calibró con los 0,6 s y en la vegetal no hay dato. Los glóbulos reales no dejan pasar la sal: «membrana no selectiva» es un caso imaginario. Los valores de la célula vegetal (≈ 0,2 mol/L de NaCl en el borde de la plasmólisis y una pared de ≈ 10 MPa de rigidez) son órdenes de magnitud, <b>sin verificar</b>; en los laboratorios de verdad se usa sacarosa, porque la sal daña a las plantas. La célula está muy ampliada respecto del vaso, y las partículas son de maqueta: su cantidad sale del modelo, su posición no. Modelo educativo: verificá los datos con tu docente o manual.</p>
  ${fuentes([
    { texto: '«Saline (medicine)», Wikipedia: 0,9 % NaCl = 154 mmol/L, 308 mOsm/L calculados y 286 con el coeficiente osmótico 0,93.', url: 'https://en.wikipedia.org/wiki/Saline_(medicine)' },
    { texto: '«Plasma osmolality», Wikipedia: 275–299 mOsm/kg en el plasma humano.', url: 'https://en.wikipedia.org/wiki/Plasma_osmolality' },
    { texto: '«Red blood cell», Wikipedia: 90 fL, 136 µm² de superficie y esfera de 150 fL sin estirar la membrana.', url: 'https://en.wikipedia.org/wiki/Red_blood_cell' },
    { texto: 'Denysova y Nitsche, «Conclusions about osmotically inactive volume and osmotic fragility from a detailed erythrocyte model», <i>J Theor Biol</i>, 2022: fracción osmóticamente inactiva aparente ≈ 0,5.', url: 'https://europepmc.org/article/MED/35051431' },
    { texto: 'Anderson y Lovrien, «Human red cell hemolysis rates in the subsecond to seconds range», <i>Biophys J</i>, 1977: ≈ 0,6 s hasta romperse en agua pura.', url: 'https://europepmc.org/article/MED/911981' },
    { texto: 'Massaldi, Richieri y Mel, «Osmotic fragility model for red cell populations», <i>Biophys J</i>, 1988: el volumen crítico es 6–12 % mayor que el de la esfera.', url: 'https://europepmc.org/article/MED/3207827' },
    { texto: 'Yang y Kamino, <i>Jpn J Physiol</i>, 1995: otro estimador, hemólisis desde 1,25× el volumen normal.', url: 'https://europepmc.org/article/MED/8713172' },
    { texto: '«Tonicity», Wikipedia: plasmólisis, pared celular y la urea isoosmolar que revienta glóbulos.', url: 'https://en.wikipedia.org/wiki/Tonicity' },
    { texto: '«Plasmolysis», Wikipedia: se induce con soluciones fuertes de sal o sacarosa en Elodea o epidermis de cebolla; la pared evita que estalle.', url: 'https://en.wikipedia.org/wiki/Plasmolysis' },
    { texto: "«Osmotic pressure», Wikipedia: ecuación de van 't Hoff.", url: 'https://en.wikipedia.org/wiki/Osmotic_pressure' },
  ])}`
