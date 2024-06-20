const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const walk = require("acorn-walk");

class Graph {
  constructor() {
    this.nodes = new Map();
  }

  addNode(node) {
    if (!this.nodes.has(node)) {
      this.nodes.set(node, []);
    }
  }

  addEdge(fromNode, toNode) {
    if (!this.nodes.has(fromNode)) {
      this.addNode(fromNode);
    }
    if (!this.nodes.has(toNode)) {
      this.addNode(toNode);
    }
    this.nodes.get(fromNode).push(toNode);
  }

  printGraph() {
    for (let [node, dependencies] of this.nodes) {
      console.log(`${node} -> ${dependencies.join(", ")}`);
    }
    console.log("\n", this.nodes);
  }
}

function getDependencies(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const ast = acorn.parse(content, { sourceType: "module", ecmaVersion: 2020 });

  const dependencies = [];
  walk.simple(ast, {
    ImportDeclaration(node) {
      dependencies.push(node.source.value);
    },
    CallExpression(node) {
      if (node.callee.name === "require" && node.arguments.length === 1) {
        const argument = node.arguments[0];
        if (argument.type === "Literal") {
          dependencies.push(argument.value);
        }
      }
    },
  });

  return dependencies;
}

function resolvePath(basePath, relativePath) {
  const possibleExtensions = [".js"]; // Add other extensions if necessary
  for (const ext of possibleExtensions) {
    const fullPath = path.resolve(
      path.dirname(basePath),
      `${relativePath}${ext}`
    );
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  throw new Error(`Cannot resolve module: ${relativePath}`);
}

function buildDependencyTree(entryFilePath) {
  const graph = new Graph();
  const stack = [entryFilePath];
  const visited = new Set();
  const pathStack = [];

  while (stack.length > 0) {
    const currentFilePath = stack.pop();
    if (visited.has(currentFilePath)) continue;

    if (pathStack.includes(currentFilePath)) {
      console.warn(
        `Cyclic dependency detected: ${pathStack.join(
          " -> "
        )} -> ${currentFilePath}`
      );
      continue;
    }

    visited.add(currentFilePath);
    pathStack.push(currentFilePath);
    graph.addNode(currentFilePath);

    const dependencies = getDependencies(currentFilePath);
    for (const dep of dependencies) {
      const depFilePath = resolvePath(currentFilePath, dep);
      graph.addNode(depFilePath);
      graph.addEdge(currentFilePath, depFilePath);
      stack.push(depFilePath);
    }

    pathStack.pop();
  }

  return graph;
}

// Example usage
const entryFilePath = path.resolve(__dirname, "index.js");
const dependencyGraph = buildDependencyTree(entryFilePath);
dependencyGraph.printGraph();
