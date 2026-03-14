const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'src', 'data', 'storyNodes.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
let storyData = JSON.parse(rawData);

const choiceRewrites = {
  q1: [
    "Fomenta la rivalidad interna para destacar individualmente",
    "Busca mejorar continuamente su desempeño personal y grupal",
    "Prioriza su visibilidad sobre los resultados del equipo",
    "Centraliza el conocimiento para volverse indispensable"
  ],
  q2: [
    "Asumir permanentemente las funciones del otro",
    "Brindar apoyo estratégico cuando el compañero lo requiere",
    "Evitar involucrarse para no generar discrepancias",
    "Limitarse estrictamente a la descripción de su cargo"
  ],
  q3: [
    "El reglamento normativo interno",
    "El perfil estratégico del colaborador Avellano",
    "El manual de procedimientos operativos",
    "El marco de certificación corporativa"
  ],
  q4: [
    "Confianza transversal",
    "Transparencia y Honestidad",
    "Empatía organizacional",
    "Resistencia dogmática al cambio"
  ],
  q5: [
    "Micromanejar cada detalle del proceso asignado.",
    "Asumir preventivamente que habrá fallas e intervenir.",
    "Ceder autonomía confiando en la capacidad de ejecución del equipo.",
    "Revertir la delegación y ejecutar la tarea directamente."
  ],
  q6: [
    "Atribuir la desviación a factores externos incontrolables.",
    "Omitir el reporte del error para salvaguardar su reputación.",
    "Notificar la desviación oportunamente y liderar la acción correctiva.",
    "Aguardar a que la auditoría detecte la inconformidad."
  ],
  q7: [
    "Exponer públicamente su falta de experiencia para presionarlo a mejorar.",
    "Obligarlo a asumir el liderazgo de la tarea sin acompañamiento previo.",
    "Comprender su curva de aprendizaje, brindarle mentoría y acompañamiento.",
    "Reasignar la tarea a otro talento y aislar al nuevo integrante."
  ],
  q8: [
    "Una tarea rutinaria ejecutada en el horario laboral.",
    "Una directriz estratégica que establece principios, compromisos y límites de actuación.",
    "Un listado secuencial de actividades por departamento.",
    "Un registro histórico de indicadores de gestión."
  ],
  q9: [
    "Cumplir un mero formalismo documental exigido por normativas.",
    "Alimentar bases de datos y registros sin impacto operativo.",
    "Asegurar la integridad física del talento humano y garantizar la continuidad del negocio.",
    "Burocratizar y ralentizar la operatividad intencionalmente."
  ],
  q10: [
    "Detener inmediatamente la operación, mitigar el riesgo y reentrenar al operador.",
    "Permitir la maniobra para evaluar empíricamente las consecuencias del riesgo.",
    "Documentar fotográficamente la infracción sin intervenir, para el informe mensual.",
    "Omitir la infracción asumiendo que el operador conoce su propio nivel de riesgo."
  ],
  q11: [
    "Para garantizar que las operaciones se ejecuten de forma estructurada, controlada y eficiente.",
    "Para incrementar el volumen de documentación exigida por la certificación.",
    "Para justificar el aumento de comités y reuniones interdepartamentales.",
    "Para superar exclusivamente los requerimientos de la auditoría externa."
  ],
  q12: [
    "Una actividad aislada ejecutada por un solo colaborador.",
    "Un conjunto interrelacionado de actividades que transforman elementos de entrada en resultados de valor.",
    "Un manual físico de instrucciones técnicas.",
    "Una sesión de planificación estratégica."
  ],
  q13: [
    "Un bloque fundamental de ejecución para cumplir un hito dentro de un proceso mayor.",
    "El objetivo macro estratégico del proceso.",
    "El entregable final que se presenta a la Gerencia.",
    "El líder funcional del macroproceso."
  ],
  q14: [
    "Un auditor externo que certifica el proceso.",
    "Una matriz de indicadores de rendimiento (KPIs).",
    "El documento técnico que estandariza el paso a paso metodológico para ejecutar una actividad.",
    "El entregable final producido por la cadena de valor."
  ],
  q15: [
    "Un mecanismo sistemático diseñado para prevenir, detectar y corregir desviaciones operativas.",
    "Un paso optativo que se aplica únicamente cuando hay exceso de recursos.",
    "Una junta directiva de revisión de resultados trimestrales.",
    "Un requerimiento legal sin impacto en la calidad del resultado final."
  ],
  q16: [
    "Cualquier colaborador operativo que ejecute una tarea específica del flujo.",
    "El rol o área investida de autoridad para garantizar el rendimiento y cumplimiento de los objetivos del proceso.",
    "El usuario final que recibe el producto o servicio.",
    "Cualquier miembro del Comité Estratégico."
  ],
  q17: [
    "Representan 'Controles' estadísticos aislados.",
    "Representan 'Actividades' secuenciales que conforman un 'Proceso' integral.",
    "Representan iniciativas de Cultura Organizacional.",
    "Son contingencias operativas sin catalogación en Sistemas de Gestión."
  ],
  q18: [
    "Ambos conceptos son semánticamente idénticos en ingeniería de procesos.",
    "El procedimiento establece la metodología estándar (el cómo), y el control verifica su cumplimiento y previene desviaciones.",
    "El procedimiento es de estricto cumplimiento, mientras que el control es sugerido.",
    "El control es diseñado por la Alta Gerencia y el procedimiento por los operarios."
  ],
  q19: [
    "Mantener la operación asumiendo el riesgo residual implícito.",
    "Descartar el control unilateralmente sin notificar al líder del proceso.",
    "Escalar de inmediato la desviación al responsable del proceso fundamentando la actualización técnica requerida.",
    "Burlar el control inútil para acelerar los tiempos de ejecución."
  ],
  q20: [
    "La volatilidad favorable del entorno logístico competitivo.",
    "La inversión desmedida en tecnologías sobre-dimensionadas.",
    "La ejecución individualista y aislada de metas desconectadas.",
    "La integración sinérgica de procesos estandarizados, políticas rigorosas de SST y una sólida Cultura Organizacional."
  ]
};

const failFeedbackRewrites = {
  q1: "El verdadero marco competitivo exige una mejora continua personal que potencie al equipo, no la rivalidad interna.",
  q2: "El servicio corporativo implica sinergia y soporte estratégico ante picos operativos, sin suplantar responsabilidades.",
  q3: "Nuestro ADN operativo está codificado estructuralmente en el perfil del colaborador Avellano.",
  q4: "La innovación exige adaptabilidad. La resistencia sistemática al cambio frena la competitividad.",
  q5: "La Confianza se demuestra delegando efectivamente y empoderando al talento para la toma de decisiones.",
  q6: "La Honestidad profesional requiere escalamiento oportuno de errores para aplicar acciones correctivas tempranas.",
  q7: "La Empatía gerencial consiste en entender el nivel madurativo del talento y proveer la mentoría adecuada.",
  q8: "Una Política es el manifiesto directivo supremo que dicta el marco de acción y las fronteras éticas.",
  q9: "SST no es burocracia; es el blindaje estructural que garantiza la integridad humana y la sostenibilidad operativa.",
  q10: "Ante vulneraciones críticas de seguridad, la inmovilización inmediata de la operación no es opcional, es imperativa.",
  q11: "La gestión por procesos elimina la fragmentación (los 'silos') e instaura una cadena de valor productiva y medible.",
  q12: "Un Proceso es la maquinaria sistémica que convierte insumos brutos en resultados de alto valor percibido.",
  q13: "Una Actividad es el engranaje metodológico indispensable para movilizar el proceso hacia su meta principal.",
  q14: "Sin un Procedimiento documentado, el conocimiento es inestable y las operaciones pierden repetibilidad y calidad.",
  q15: "Los Controles son las barreras arquitectónicas que aseguran que el output mantenga las especificaciones de calidad.",
  q16: "La rendición de cuentas (accountability) de un proceso entero recae en el Líder asignado, no en operadores sueltos.",
  q17: "El alineamiento de tareas interdependientes es lo que orquesta verdaderamente la Cadena de Valor.",
  q18: "Mientras el Procedimiento enseña el método correcto, el Control previene fallos mitigando la variabilidad.",
  q19: "La Mejora Continua exige que frente a controles ineficaces, se documenten y propongan actualizaciones inmediatas.",
  q20: "La excelencia sostenible es la suma innegociable de procesos eficientes, talento seguro y una sólida cultura compartida."
};

storyData.nodes = storyData.nodes.map(node => {
  // Replace choices if dilemma
  if (choiceRewrites[node.id] && node.choices) {
    node.choices = node.choices.map((choice, index) => {
      choice.text = choiceRewrites[node.id][index];
      return choice;
    });
  }
  
  // Replace feedback texts if fail node
  const originalQId = node.id.replace('_fail', '');
  if (node.id.endsWith('_fail') && failFeedbackRewrites[originalQId]) {
    node.text = failFeedbackRewrites[originalQId];
    if (node.choices) {
      node.choices.forEach(c => {
        if (c.id.endsWith('_retry')) {
           c.text = "Entendido, revaluar estrategia";
        }
      });
    }
  }

  return node;
});

fs.writeFileSync(jsonPath, JSON.stringify(storyData, null, 2));
console.log('storyNodes.json deeply updated with highly formal choices and feedback.');
