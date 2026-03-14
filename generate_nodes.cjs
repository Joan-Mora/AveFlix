const fs = require('fs');

const nodes = [];

// Node 0: Start
nodes.push({
  id: "start",
  nodeType: "start",
  pillar: "none",
  mediaType: "image",
  mediaUrl: "/assets/images/avelino_dark_bg.png", // Start screen can have the dark bg. But the rest won't.
  audioBgm: "/assets/audio/intro.mp3",
  title: "Avelino Aventurero",
  text: "El Origen: En busca del Tesoro de la Excelencia. Bienvenido, explorador. La verdadera prueba comienza ahora en la espesa Selva de los Negocios. Estás listo para demostrar tu ADN Avellano?",
  choices: [
    { id: "start_btn", text: "Comenzar Expedición", nextNode: "q1", points: 0, pillarPoints: {}, isCorrect: true, sfx: "/assets/audio/click.mp3" }
  ]
});

const questionsData = [
  // CULTURA
  { id: "q1", title: "Cultura - Campamento 1", pillar: "Cultura", image: "/assets/images/scene_q1.png", text: "Avelino reúne a otros animales exploradores alrededor del mapa. Para asegurar el éxito, el equipo debe comprender cómo trabajan los mejores en esta selva.\n\nUn colaborador competitivo en Avellano es alguien que:", options: [
    { text: "Compite con sus compañeros", id: "a" },
    { text: "Busca mejorar continuamente su desempeño", id: "b", correct: true },
    { text: "Quiere sobresalir sobre los demás", id: "c" },
    { text: "Evita compartir información", id: "d" }
  ], failMsg: "Competitividad en Avellano significa superarse a uno mismo y mejorar continuamente." },

  { id: "q2", title: "Cultura - El Camino", pillar: "Cultura", image: "/assets/images/scene_q2.png", text: "Durante la marcha, un pequeño tucán no puede alzar el vuelo cargando sus provisiones. Avelino se acerca rápidamente.\n\nSer servicial significa:", options: [
    { text: "Hacer el trabajo de los demás", id: "a" },
    { text: "Apoyar cuando otros lo necesitan", id: "b", correct: true },
    { text: "Evitar conflictos", id: "c" },
    { text: "Hacer solo lo que corresponde al cargo", id: "d" }
  ], failMsg: "Ser servicial es entender el impacto global y extender la mano para apoyar al equipo." },

  { id: "q3", title: "Cultura - El Monumento", pillar: "Cultura", image: "/assets/images/scene_q3.png", text: "Frente a unas antiguas ruinas, Avelino descubre grabadas en piedra las características legendarias de su tribu.\n\nLa combinación de nuestros valores más una actitud competitiva y servicial define:", options: [
    { text: "El reglamento interno", id: "a" },
    { text: "El perfil del colaborador Avellano", id: "b", correct: true },
    { text: "El manual de procesos", id: "c" },
    { text: "El sistema de gestión", id: "d" }
  ], failMsg: "El ADN se refleja en el perfil del colaborador Avellano: valores en acción." },

  { id: "q4", title: "Cultura - La Guarida", pillar: "Cultura", image: "/assets/images/scene_q4.png", text: "El equipo encuentra una bifurcación oscura y temen avanzar por miedo a lo desconocido, demostrando una actitud negativa ante la incertidumbre.\n\nCuál de los siguientes NO hace parte de los valores de la cultura Avellano?", options: [
    { text: "Confianza", id: "a" },
    { text: "Honestidad", id: "b" },
    { text: "Empatía", id: "c" },
    { text: "Resistencia al cambio", id: "d", correct: true }
  ], failMsg: "La resistencia al cambio bloquea el crecimiento. Nuestros valores son Confianza, Honestidad, Empatía..." },

  { id: "q5", title: "Cultura - La Fogata", pillar: "Cultura", image: "/assets/images/scene_q5.png", text: "Cae la noche. Avelino necesita que el mono vigile la fogata mientras el resto del equipo recupera energías.\n\nPara mostrar 'Confianza', él debe:", options: [
    { text: "Quedarse despierto vigilando a quien asignó para la tarea.", id: "a" },
    { text: "Asumir que la persona fallará y apagar la fogata.", id: "b" },
    { text: "Creer en la capacidad de su compañero y dejarle cumplir su compromiso.", id: "c", correct: true },
    { text: "No asignar la tarea y hacer todo él mismo.", id: "d" }
  ], failMsg: "La Confianza implica delegar y creer en la fiabilidad del equipo." },

  { id: "q6", title: "Cultura - El Descuido", pillar: "Cultura", image: "/assets/images/scene_q6.png", text: "A la mañana siguiente, Avelino camina preocupado: acaba de notar que su vital brújula magnética no está en su bolsillo.\n\nLa acción más 'Honesta' de su parte es:", options: [
    { text: "Decir que un mono se la robó.", id: "a" },
    { text: "Fingir que sabe el camino para no preocupar a nadie.", id: "b" },
    { text: "Reportarlo oportunamente al equipo y asumir la responsabilidad.", id: "c", correct: true },
    { text: "Esperar a que alguien más se dé cuenta.", id: "d" }
  ], failMsg: "La Honestidad es dar la cara y no ocultar información operativa a la tribu." },

  { id: "q7", title: "Cultura - El Paso de Piedras", pillar: "Cultura", image: "/assets/images/scene_q7.png", text: "Llegan a un río furioso con rocas resbaladizas. Un joven leopardo explorador está paralizado de miedo en la orilla.\n\nCómo demuestra Avelino 'Empatía'?", options: [
    { text: "Burlándose para que cruce rápido.", id: "a" },
    { text: "Obligándolo a cruzar primero para que se le quite el miedo.", id: "b" },
    { text: "Comprendiendo su temor, mostrándole por dónde pisar y acompañándolo.", id: "c", correct: true },
    { text: "Dejándolo atrás por ser débil.", id: "d" }
  ], failMsg: "La Empatía es ponerse en los zapatos del otro y acompañar su desarrollo." },

  // SST
  { id: "q8", title: "SST - El Campamento de Reglas", pillar: "SST", image: "/assets/images/scene_q8.png", text: "Al llegar al segundo campamento, notan un gran panel de madera tallada marcando el territorio y las normas vitales.\n\nQué es una política dentro de una organización?", options: [
    { text: "Una tarea que realiza un trabajador en su jornada laboral.", id: "a" },
    { text: "Un documento que establece los principios, lineamientos y compromisos que orientan decisiones.", id: "b", correct: true },
    { text: "Un listado de actividades que debe realizar un área.", id: "c" },
    { text: "Un registro de control operativo.", id: "d" }
  ], failMsg: "Una política son los principios o reglas del juego de todo el campamento." },

  { id: "q9", title: "SST - Preparando el Equipo", pillar: "SST", image: "/assets/images/scene_q9.png", text: "Antes de escalar una pendiente peligrosa, Avelino instruye a todos para que revisen firmemente sus cascos y mosquetones.\n\nAvelino descubre que implementar medidas de SST sirve principalmente para:", options: [
    { text: "Cumplir con un requisito del sabio de la tribu.", id: "a" },
    { text: "Llenar formatos en papel.", id: "b" },
    { text: "Asegurar la protección de su propia vida y la continuidad de la expedición.", id: "c", correct: true },
    { text: "Hacer que la expedición sea más lenta a propósito.", id: "d" }
  ], failMsg: "SST no es burocracia, es un escudo protector de la vida." },

  { id: "q10", title: "SST - Prevención Crítica", pillar: "SST", image: "/assets/images/scene_q10.png", text: "De pronto, un miembro de la tribu comienza a cruzar un puente de lianas podridas, ignorando el aviso y poniendo su vida en riesgo mortal.\n\nEl primer paso de Avelino es:", options: [
    { text: "Detener la acción inmediatamente y alertarlo del peligro para alinearlo a la política.", id: "a", correct: true },
    { text: "Dejarlo cruzar para ver si se cae y aprende la lección.", id: "b" },
    { text: "Tomarle una foto para mostrarle a los demás lo que no se hace.", id: "c" },
    { text: "Ignorarlo, ya que cada quien asume sus riesgos.", id: "d" }
  ], failMsg: "Detener el riesgo inmediato es responsabilidad de todos." },

  // SIG
  { id: "q11", title: "SIG - La Cueva de los Planos", pillar: "SIG", image: "/assets/images/scene_q11.png", text: "Adentro de una cueva mística, encuentran pergaminos con planos detallados sobre cómo fabricar antorchas estables y duraderas.\n\nPor qué es importante que las empresas trabajen por procesos?", options: [
    { text: "Para que las actividades se realicen de manera ordenada, controlada y eficiente.", id: "a", correct: true },
    { text: "Para aumentar la cantidad de documentos.", id: "b" },
    { text: "Para generar más reuniones.", id: "c" },
    { text: "Para cumplir únicamente con auditorías.", id: "d" }
  ], failMsg: "El trabajo por procesos estandariza el éxito." },

  { id: "q12", title: "SIG - La Transformación", pillar: "SIG", image: "/assets/images/scene_q12.png", text: "Con las antorchas bien hechas, logran ver cómo un oscuro túnel se transforma gracias a su esfuerzo en un camino de brillante luz.\n\nQué es un proceso dentro de una organización?", options: [
    { text: "Una tarea que realiza un trabajador.", id: "a" },
    { text: "Un conjunto de actividades relacionadas que transforman entradas en resultados de valor.", id: "b", correct: true },
    { text: "Un documento con instrucciones de trabajo.", id: "c" },
    { text: "Una reunión de trabajo.", id: "d" }
  ], failMsg: "Un proceso es una cadena de transformación orientada a generar valor." },

  // reusing generated images properly from here (1 to 12) - NOT menu image
  { id: "q13", title: "SIG - Talla en Madera", pillar: "SIG", image: "/assets/images/scene_q1.png", text: "Para no perderse en el templo final, marcan la pared con símbolos específicos en intervalos de diez pasos.\n\nQué es una actividad dentro de un proceso?", options: [
    { text: "Un paso específico que se realiza para cumplir una parte del proceso.", id: "a", correct: true },
    { text: "El objetivo del proceso.", id: "b" },
    { text: "El resultado final del proceso.", id: "c" },
    { text: "El responsable del proceso.", id: "d" }
  ], failMsg: "Las actividades son los eslabones operativos." },

  { id: "q14", title: "SIG - El Báculo Sagrado", pillar: "SIG", image: "/assets/images/scene_q3.png", text: "Avelino sostiene el Báculo Sagrado, el cual contiene el texto escrito de cómo atravesar la arena movediza paso a paso sin hundirse.\n\nQué es un procedimiento?", options: [
    { text: "Una persona que ejecuta el proceso.", id: "a" },
    { text: "Un conjunto de reglas para medir resultados.", id: "b" },
    { text: "La forma documentada que explica cómo se deben realizar las actividades de un proceso.", id: "c", correct: true },
    { text: "El resultado final de un proceso.", id: "d" }
  ], failMsg: "El procedimiento es el mapa escrito que dice 'cómo' hacerlo." },

  { id: "q15", title: "SIG - El Filtro Correcto", pillar: "SIG", image: "/assets/images/scene_q4.png", text: "Revisando el mapa cuidadosamente bajo la estricta luz de una linterna, Avelino detecta un error de cálculo del equipo contrario y evita que caigan en un pozo sin fondo.\n\nQué es un control dentro de un proceso?", options: [
    { text: "Una actividad que permite prevenir, detectar o corregir errores.", id: "a", correct: true },
    { text: "Una tarea opcional dentro del proceso.", id: "b" },
    { text: "Una reunión de seguimiento.", id: "c" },
    { text: "Una norma externa.", id: "d" }
  ], failMsg: "El control es la verificación antes de que el error avance." },

  { id: "q16", title: "SIG - Responsabilidades", pillar: "SIG", image: "/assets/images/scene_q7.png", text: "Avelino porta, con una medalla de mando, el rol de vigilar la construcción del refugio. Él debe guiar a todo el mundo y responder por el resultado.\n\nQuién es el responsable de un proceso?", options: [
    { text: "La persona que realiza una actividad puntual.", id: "a" },
    { text: "El área o persona encargada de asegurar que el proceso funcione y cumpla sus objetivos.", id: "b", correct: true },
    { text: "El cliente del proceso.", id: "c" },
    { text: "Cualquier persona de la empresa.", id: "d" }
  ], failMsg: "El dueño del proceso orquesta la cadena completa." },

  { id: "q17", title: "SIG - Avance Calculado", pillar: "SIG", image: "/assets/images/scene_q8.png", text: "En medio del laberinto final, cada miembro da un paso en falso, revisa la estructura con su farol y entonces se mueve de nuevo.\n\nQué es cada una de estas acciones independientes pero relacionadas para lograr el fin de salir?", options: [
    { text: "Son 'Controles'.", id: "a" },
    { text: "Son 'Actividades' de un proceso mayor.", id: "b", correct: true },
    { text: "Son la 'Cultura'.", id: "c" },
    { text: "No tienen nombre en SIG.", id: "d" }
  ], failMsg: "Cada paso minucioso es una 'Actividad'." },

  { id: "q18", title: "SIG - Contrastes Místicos", pillar: "SIG", image: "/assets/images/scene_q9.png", text: "Un animal pregunta a Avelino: 'Por qué leer el manual de amarre para la soga si igual vas a tirar de ella para ver si aguanta mi peso?'\n\nLa diferencia entre el 'procedimiento' (leer) y el 'control' (tirar) es:", options: [
    { text: "Son exactamente lo mismo en la jungla.", id: "a" },
    { text: "El procedimiento explica el 'cómo', mientras el control verifica y previene fallas.", id: "b", correct: true },
    { text: "El procedimiento es obligatorio, el control no.", id: "c" },
    { text: "El control lo escribe Avelino y el procedimiento el Sabio.", id: "d" }
  ], failMsg: "El procedimiento guía; el control asegura calidad final." },

  { id: "q19", title: "SIG - Mejora Continua", pillar: "SIG", image: "/assets/images/scene_q10.png", text: "Tras mucho uso, el arnés está cediendo. Avelino se percata que revisar el equipo ya no es suficiente, pues aunque pasa el chequeo, se siente muy desgastado.\n\nSi el control preventivo falló debido a la edad del elemento, Avelino debe:", options: [
    { text: "Seguir escalando y cruzar los dedos.", id: "a" },
    { text: "Tirar el equipo sin avisar a nadie.", id: "b" },
    { text: "Proponer al líder responsable cambiar el tipo de herramienta basándose en la evidencia.", id: "c", correct: true },
    { text: "Quejarse en secreto con los demás pollitos.", id: "d" }
  ], failMsg: "La mejora continua requiere elevar problemas y escalar decisiones basadas en KPI." },

  { id: "q20", title: "Victoria Final", pillar: "SIG", image: "/assets/images/scene_q11.png", text: "El oro resplandece! La expedición Avellano llega por fin al corazón del templo, descubriendo el mítico Tesoro de la Excelencia bajo la luz de un sol radiante.\n\nEste éxito a largo plazo se debe principalmente a:", options: [
    { text: "La suerte de no haberse topado con tigres.", id: "a" },
    { text: "Llevar mochilas muy caras y brújulas brillantes.", id: "b" },
    { text: "Que Avelino resolvió todo de manera individual sin ayuda.", id: "c" },
    { text: "El correcto funcionamiento estandarizado de los procesos, las políticas seguras de SST, sumado a la fuerte cultura Avellano.", id: "d", correct: true }
  ], failMsg: "Los 3 Pilares juntos hacen sostenible a la organización en el tiempo." },
];

for (let i = 0; i < questionsData.length; i++) {
  const q = questionsData[i];
  const nextNodeId = i + 1 < questionsData.length ? questionsData[i+1].id : "end_success";
  const failNodeId = q.id + "_fail";

  // Create choices
  const formattedChoices = q.options.map((opt, idx) => {
    return {
      id: `${q.id}_opt_${opt.id}`,
      text: opt.text,
      nextNode: opt.correct ? nextNodeId : failNodeId,
      points: opt.correct ? 1000 : 0,
      pillarPoints: opt.correct ? { [q.pillar]: 1000 } : {},
      isCorrect: !!opt.correct,
      sfx: opt.correct ? "/assets/audio/success.mp3" : "/assets/audio/error.mp3",
      failType: opt.correct ? "none" : ("error_" + q.id)
    };
  });

  // The main dilemma node
  nodes.push({
    id: q.id,
    nodeType: "dilemma",
    pillar: q.pillar,
    mediaType: "image",
    mediaUrl: q.image,
    audioBgm: "/assets/audio/misterio.mp3",
    title: q.title,
    text: q.text,
    choices: formattedChoices
  });

  // The failure feedback node
  nodes.push({
    id: failNodeId,
    nodeType: "feedback_fail",
    pillar: q.pillar,
    mediaType: "image",
    mediaUrl: q.image, // keep same image
    audioBgm: "/assets/audio/fail.mp3",
    title: `Desviación en ${q.pillar}`,
    text: q.failMsg,
    retryNode: q.id,
    choices: [
      { id: `${failNodeId}_retry`, text: "Entendido, intentar de nuevo", nextNode: q.id, points: 0, pillarPoints: {}, isCorrect: false, sfx: "/assets/audio/click.mp3" }
    ]
  });
}

// End node
nodes.push({
  id: "end_success",
  nodeType: "end",
  pillar: "none",
  mediaType: "image",
  mediaUrl: "/assets/images/scene_q12.png", // Glorious exit
  audioBgm: "/assets/audio/victoria.mp3",
  title: "Expedición Completada!",
  text: "Felicidades, llegaste al final! Has demostrado que dominas los pilares de la organización. Eres un verdadero aventurero Avellano!",
  choices: []
});

fs.writeFileSync("src/data/storyNodes.json", JSON.stringify({ nodes }, null, 2));
console.log("Successfully generated narrative contextualized storyNodes.json");
