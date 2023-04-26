import fs from 'fs';

class Aggregator {
  private count = 0;
  private sizes: number[];

  constructor() {
    this.sizes = [];
  }

  record(size: number) {
      this.count += size;
      this.sizes.push(size);
  }

  reportOverallUsage() {
    return this.count;
  }

  reportSizes() {
    return this.sizes.sort((a, b) => {
      if (+a < +b) return -1;
      return 1;
    });
  }
}

class DirNode {
  private parent: DirNode | null;
  readonly value: string;
  private children: Map<string, DirNode>;
  private files: Map<string, number>;
  private aggregator: Aggregator;

  constructor(value: string, parent: DirNode | null, aggregator: Aggregator) {
    this.value = value;
    this.parent = parent;
    this.children = new Map<string, DirNode>();
    this.files = new Map<string, number>();
    this.aggregator = aggregator;
  }
  addChild(value: string) {
    const child = new DirNode(value, this, this.aggregator);
    this.children.set(value, child);
  }

  addFile(fileName: string, fileSize: number) {
    this.files.set(fileName, fileSize);
  }
  navToParent() {
    return this.parent ? this.parent : this;
  }
  navToChild(childName: string) {
    const child = this.children.get(childName);
    if (!child) {
      throw new Error(`attempted to access child: ${childName}`)
    }
    return child;
  }

  getSize(): number {
    let size = 0;

    for (let value of this.files.values()) {
      size += value;
    }

    for (let child of this.children.values()) {
      size += child.getSize();
    }
    this.aggregator.record(size);
    return size;
  }
}

const fileinfo = fs.readFileSync("./prod.txt").toString();

const commands = fileinfo.split('$ ');

const agg = new Aggregator();

const rootNode = new DirNode('/', null, agg);

let currentNode = rootNode;

commands.forEach(c => {
  let slice = c.slice(0, 2);
  if (slice.length === 0) {
    return
  }
  if (slice === "cd") {
    const loc = c.split(" ")[1].replace("\n", "");
    if(loc === "/") {
      currentNode = rootNode;
    } else if (loc === "..") {
      currentNode = currentNode.navToParent();
    } else {
      currentNode = currentNode.navToChild(loc);
    }

  } else {
    const splits = c.split("\n").slice(1).filter(el => el.length > 0); 
    splits.forEach(line => {
      if(line.slice(0, 3) === "dir") {
        const [_, title] = line.split(" ");
        currentNode.addChild(title);
        return;
      }
        const [num, title] = line.split(" ");
        currentNode.addFile(title, +num);
    })
  }
});

const size = rootNode.getSize();

const report = agg.reportSizes();
const systemSize = 70000000;
const availSize = systemSize - size;

const result = report.find(el => availSize + el >= 30000000);

console.log(`Reported size is: ${size}, smallest deletable size is ${result}`)
