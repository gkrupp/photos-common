
const pathlib = require('path')
const Darknet = require('darknet').Darknet

const yolo9000 = new Darknet({
  weights: pathlib.join(__dirname, './data/yolo9000.weights'),
  config: pathlib.join(__dirname, './data/yolo9000.cfg'),
  namefile: pathlib.join(__dirname, './data/9k.names')
})

const detectionConfig = {
  thresh: 0.05,
  nms: 0.5,
  hier_thresh: 0.5,
  relative: true
}

module.exports = {
  detect (img) {
    const preds = yolo9000.detect(img, detectionConfig)
    preds.sort((a, b) => b.prob - a.prob)
    return preds
  },
  getLabels (preds) {
    const labels = new Set()
    preds.forEach(pred => labels.add(pred.name))
    return Array.from(labels)
  }
}
