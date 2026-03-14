const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'src', 'data', 'storyNodes.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
let storyData = JSON.parse(rawData);

// Función auxiliar para formalizar textos
function formalizeText(text) {
  if (!text) return text;
  
  let newText = text;
  
  // Reemplazos de tono "infantil/aventura" a "corporativo/expedición"
  const replacers = [
    { from: /Avelino, el pollito explorador/gi, to: 'Avelino, Líder de Expedición' },
    { from: /pollito explorador/gi, to: 'líder corporativo' },
    { from: /pollito/gi, to: 'colaborador' },
    { from: /animales exploradores/gi, to: 'equipos de alto rendimiento' },
    { from: /animales/gi, to: 'colaboradores' },
    { from: /tribu/gi, to: 'equipo estratégico' },
    { from: /sabio de la tribu/gi, to: 'Comité Directivo' },
    { from: /el Sabio/gi, to: 'la Alta Gerencia' },
    { from: /Sabio/gi, to: 'Directivo' },
    { from: /su tribu/gi, to: 'su equipo de trabajo' },
    { from: /la jungla/gi, to: 'el ecosistema corporativo' },
    { from: /esta selva/gi, to: 'este entorno competitivo' },
    { from: /la selva/gi, to: 'el mercado' },
    { from: /espesa Selva de los Negocios/gi, to: 'dinámico mercado actual' },
    { from: /Tesoro/gi, to: 'Objetivo Estratégico' },
    { from: /campamento/gi, to: 'hito' },
    { from: /Campamento/gi, to: 'Hito' },
    { from: /expedición/gi, to: 'gestión' },
    { from: /fogata/gi, to: 'operación' },
    { from: /escalar/gi, to: 'avanzar' },
    { from: /brújula/gi, to: 'guía operativa' },
    { from: /pergamino con instrucciones/gi, to: 'manual de procesos' },
    { from: /antorcha/gi, to: 'herramienta' },
    { from: /mochilas muy caras/gi, to: 'recursos ilimitados' },
    { from: /brújulas brillantes/gi, to: 'software costoso' },
    { from: /tigres/gi, to: 'crisis imprevistas' },
    { from: /monos/gi, to: 'fallas externas' },
    { from: /mono/gi, to: 'tercero' },
    { from: /explorador novato/gi, to: 'nuevo talento' },
    { from: /puente podrido/gi, to: 'procedimiento obsoleto' },
    { from: /laberinto/gi, to: 'proyecto complejo' },
    { from: /cruzar el río/gi, to: 'asumir nuevos retos' },
  ];

  replacers.forEach(r => {
    newText = newText.replace(r.from, r.to);
  });

  return newText;
}

storyData.nodes = storyData.nodes.map(node => {
  node.title = formalizeText(node.title);
  node.text = formalizeText(node.text);
  
  if (node.choices) {
    node.choices = node.choices.map(choice => {
      choice.text = formalizeText(choice.text);
      return choice;
    });
  }
  
  return node;
});

// Fix image URLs for node 13 to 20 just in case to ensure they are set
for (let i = 13; i <= 20; i++) {
  const node = storyData.nodes.find(n => n.id === `q${i}`);
  if (node) {
    node.mediaUrl = `/assets/images/scene_q${i}.png`;
  }
  const failNode = storyData.nodes.find(n => n.id === `q${i}_fail`);
  if (failNode) {
    failNode.mediaUrl = `/assets/images/scene_q${i}.png`;
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(storyData, null, 2));
console.log('storyNodes.json updated successfully with corporate tone.');
