const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'src', 'data', 'storyNodes.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
let storyData = JSON.parse(rawData);

const explicitRewrites = {
  start: {
    title: "Misión: Excelencia Operativa",
    text: "Temporada 1: En busca de la Excelencia. Bienvenido, Líder de Expedición. El desafío estratégico comienza ahora en el dinámico ecosistema competitivo. ¿Estás preparado para demostrar tu ADN Avellano y guiar a tu equipo hacia el éxito?"
  },
  q1: {
    title: "Cultura - Desempeño",
    text: "Avelino convoca a su equipo de alto rendimiento para analizar los objetivos trazados. Para asegurar el cumplimiento de las metas, es fundamental comprender la filosofía de trabajo.\n\nUn colaborador competitivo en Avellano es alguien que:"
  },
  q2: {
    title: "Cultura - Servicio",
    text: "Durante la ejecución del proyecto, un integrante del equipo se encuentra abrumado por la alta carga operativa. Avelino decide intervenir estratégicamente.\n\nSer servicial significa:"
  },
  q3: {
    title: "Cultura - Identidad",
    text: "Al identificar los cimientos del éxito en un proyecto anterior, el equipo establece un modelo a seguir.\n\nLa combinación de nuestros valores más una actitud competitiva y servicial define:"
  },
  q4: {
    title: "Cultura - Adaptabilidad",
    text: "El equipo se enfrenta a un escenario de alta incertidumbre en el mercado y algunos miembros muestran resistencia a adaptarse.\n\n¿Cuál de los siguientes NO hace parte de los valores de la cultura Avellano?"
  },
  q5: {
    title: "Cultura - Liderazgo",
    text: "Avelino necesita delegar la supervisión de un proceso crítico para cumplir con los tiempos de entrega. Para certificar el valor de 'Confianza', él debe:"
  },
  q6: {
    title: "Cultura - Responsabilidad",
    text: "Durante la evaluación del proyecto, Avelino detecta un error de cálculo en la ruta crítica que él mismo formuló. La acción más congruente con el valor de 'Honestidad' es:"
  },
  q7: {
    title: "Cultura - Gestión Humana",
    text: "Un nuevo talento recién integrado al equipo se siente inseguro ante un desafío técnico complejo. ¿Cómo demuestra Avelino 'Empatía' en este escenario?"
  },
  q8: {
    title: "SST - Directrices",
    text: "Frente a un entorno regulatorio estricto, el equipo debe alinear sus operaciones. ¿Qué es una política dentro de una organización?"
  },
  q9: {
    title: "SST - Prevención",
    text: "Avelino evalúa los riesgos operativos. La implementación de protocolos de Seguridad y Salud en el Trabajo (SST) sirve principalmente para:"
  },
  q10: {
    title: "SST - Cumplimiento",
    text: "Si Avelino detecta que un operador está ejecutando una maniobra de alto riesgo ignorando completamente la política de SST establecida, su primera acción debe ser:"
  },
  q11: {
    title: "Calidad - Eficiencia",
    text: "La estructura organizacional requiere optimización para alcanzar la competitividad deseada. ¿Por qué es fundamental que las empresas trabajen bajo un enfoque por procesos?"
  },
  q12: {
    title: "Calidad - Estructura",
    text: "En el marco de un Sistema de Gestión Integral, ¿cómo se define un 'proceso' dentro de una organización?"
  },
  q13: {
    title: "Calidad - Ejecución",
    text: "Todo macroproceso se desglosa en unidades más manejables para su correcta ejecución y monitoreo. ¿Qué es una actividad dentro de un proceso?"
  },
  q14: {
    title: "Calidad - Estandarización",
    text: "Para asegurar que las tareas se realicen de manera consistente y sin desviaciones, se requiere documentación técnica. ¿Qué es un procedimiento?"
  },
  q15: {
    title: "Calidad - Verificación",
    text: "La gestión del riesgo es inherente a la operativa empresarial. En esta línea, ¿qué función cumple un 'control' dentro de un proceso?"
  },
  q16: {
    title: "Calidad - Liderazgo",
    text: "Para garantizar el cumplimiento de los indicadores y la mejora continua, se requiere designar autoridad. ¿Quién es el responsable de un proceso?"
  },
  q17: {
    title: "Calidad - Sistematización",
    text: "Avelino analiza la data, proyecta la ruta y da la instrucción al equipo operativo. En el esquema del SIG, ¿qué representan cada una de estas acciones interconectadas para lograr el objetivo final?"
  },
  q18: {
    title: "Calidad - Herramientas",
    text: "La expedición cuenta con manuales técnicos y listas de verificación. La diferencia conceptual entre el 'procedimiento' (el manual) y el 'control' (el checklist) radica en:"
  },
  q19: {
    title: "Calidad - Mejora Continua",
    text: "Si Avelino nota que un control preventivo ha dejado de ser efectivo debido a la obsolescencia técnica de los recursos, su proceder correcto es:"
  },
  q20: {
    title: "Misión Cumplida",
    text: "Al concluir el proyecto, Avelino y su equipo alcanzan los máximos estándares de Excelencia. Este éxito sostenido a largo plazo es atribuible principalmente a:"
  }
};

storyData.nodes = storyData.nodes.map(node => {
  if (explicitRewrites[node.id]) {
    node.title = explicitRewrites[node.id].title;
    node.text = explicitRewrites[node.id].text;
  }
  return node;
});

fs.writeFileSync(jsonPath, JSON.stringify(storyData, null, 2));
console.log('storyNodes.json deeply updated with highly formal corporate tone.');
