// Adaption of JSONDigger from dabeng
// "author": "dabeng",
// "license": "MIT",
// website "https://github.com/dabeng/json-helper/issues"

export default class JSONDigger {
  constructor(datasource, idProp, organisationsProp) {
    this.ds = datasource;
    this.id = idProp;
    this.organisations = organisationsProp;
    this.count = 0;
  }

  countNodes(obj) {
    var _this = this;

    this.count++;

    if (!obj || !Object.keys(obj).length) {
      return false;
    } else {
      if (obj[this.organisations]) {
        obj[this.organisations].forEach((child) => {
          _this.countNodes(child);
        });
      }
    }
  }

  findNodeById(id) {
    const _this = this;

    this.countNodes(this.ds);
    return new Promise((resolve, reject) => {
      if (!id) {
        return reject(new Error("Parameter id is invalid."));
      }

      function findNodeById(obj, id, callback) {
        if (!_this.count) {
          return;
        }

        if (obj[_this.id] === id) {
          _this.count = 0;
          callback(null, obj);
        } else {
          if (_this.count === 1) {
            _this.count = 0;
            callback("The node doesn't exist.", null);
          }

          _this.count--;

          if (obj[_this.organisations]) {
            obj[_this.organisations].forEach((node) => {
              findNodeById(node, id, callback);
            });
          }
        }
      }

      findNodeById(this.ds, id, (msg, node) => {
        if (msg) {
          reject(new Error(msg));
        } else {
          resolve(node);
        }
      });
    });
  }

  matchConditions(obj, conditions) {
    var flag = true;
    Object.keys(conditions).some((item) => {
      if (
        typeof conditions[item] === "string" ||
        typeof conditions[item] === "number" ||
        typeof conditions[item] === "boolean"
      ) {
        if (obj[item] !== conditions[item]) {
          flag = false;
          return true;
        }
      } else if (conditions[item] instanceof RegExp) {
        if (!conditions[item].test(obj[item])) {
          flag = false;
          return true;
        }
      } else if (typeof conditions[item] === "object") {
        Object.keys(conditions[item]).some((subitem) => {
          switch (subitem) {
            case ">": {
              if (!(obj[item] > conditions[item][subitem])) {
                flag = false;
                return true;
              }

              break;
            }

            case "<": {
              if (!(obj[item] < conditions[item][subitem])) {
                flag = false;
                return true;
              }

              break;
            }

            case ">=": {
              if (!(obj[item] >= conditions[item][subitem])) {
                flag = false;
                return true;
              }

              break;
            }

            case "<=": {
              if (!(obj[item] <= conditions[item][subitem])) {
                flag = false;
                return true;
              }

              break;
            }

            case "!==": {
              if (!(obj[item] !== conditions[item][subitem])) {
                flag = false;
                return true;
              }

              break;
            }
            default: {
              // Just to make the linter happy
              flag = false;
              return true;
            }
          }
          return false; // Just to make the linter happy
        });

        if (!flag) {
          return false;
        }
      }
      return false; // Just to make the linter happy
    });
    return flag;
  }

  async findorganisations(id) {
    if (!id) {
      throw new Error("Parameter id is invalid.");
    }

    try {
      const parent = await this.findParent(id);
      return parent[this.organisations];
    } catch (err) {
      throw new Error("The child nodes don't exist.");
    }
  }

  findNodes(conditions) {
    const _this = this;

    this.countNodes(this.ds);
    return new Promise(async (resolve, reject) => {
      if (!conditions || !Object.keys(conditions).length) {
        return reject(new Error("Parameter conditions are invalid."));
      }

      let nodes = [];

      function findNodes(obj, conditions, callback) {
        if (!_this.count) {
          return;
        }

        if (_this.matchConditions(obj, conditions)) {
          nodes.push(obj);

          if (_this.count === 1) {
            _this.count = 0;
            callback(
              !nodes.length ? "The nodes don't exist." : null,
              nodes.slice(0)
            );
          }
        } else {
          if (_this.count === 1) {
            _this.count = 0;
            callback(
              !nodes.length ? "The nodes don't exist." : null,
              nodes.slice(0)
            );
          }
        }

        _this.count--;

        if (obj[_this.organisations]) {
          obj[_this.organisations].forEach((child) => {
            findNodes(child, conditions, callback);
          });
        }
      }

      findNodes(this.ds, conditions, (msg, nodes) => {
        if (msg) {
          reject(new Error(msg));
        } else {
          resolve(nodes);
        }
      });
    });
  }

  findParent(id) {
    const _this = this;

    this.countNodes(this.ds);
    return new Promise((resolve, reject) => {
      if (!id) {
        return reject(new Error("Parameter id is invalid."));
      }

      function findParent(obj, id, callback) {
        if (_this.count === 1) {
          _this.count = 0;
          callback("The parent node doesn't exist.", null);
        } else {
          _this.count--;

          if (typeof obj[_this.organisations] !== "undefined") {
            obj[_this.organisations].forEach(function (child) {
              if (child[_this.id] === id) {
                _this.count = 0;
                callback(null, obj);
              }
            });

            obj[_this.organisations].forEach(function (child) {
              findParent(child, id, callback);
            });
          }
        }
      }

      findParent(this.ds, id, (msg, parent) => {
        if (msg) {
          reject(new Error(msg));
        } else {
          resolve(parent);
        }
      });
    });
  }

  async findSiblings(id) {
    const _this = this;

    if (!id) {
      throw new Error("Parameter id is invalid.");
    }

    try {
      const parent = await this.findParent(id);
      return parent[this.organisations].filter((child) => {
        return child[_this.id] !== id;
      });
    } catch (err) {
      throw new Error("The sibling nodes don't exist.");
    }
  }

  findAncestors(id) {
    const _this = this;

    return new Promise(async (resolve, reject) => {
      if (!id) {
        return reject(new Error("Parameter id is invalid."));
      }

      let nodes = [];

      async function findAncestors(id) {
        try {
          if (id === _this.ds[_this.id]) {
            if (!nodes.length) {
              throw new Error("The ancestor nodes don't exist.");
            }

            return nodes.slice(0);
          } else {
            const parent = await _this.findParent(id);
            nodes.push(parent);
            return findAncestors(parent[_this.id]);
          }
        } catch (err) {
          throw new Error("The ancestor nodes don't exist.");
        }
      }

      try {
        const ancestors = await findAncestors(id);
        resolve(ancestors);
      } catch (err) {
        reject(err);
      }
    });
  } // validate the input parameters id and data(could be oject or array)

  validateParams(id, data) {
    if (!id) {
      throw new Error("Parameter id is invalid.");
    }

    if (
      !data ||
      (data.constructor !== Object && data.constructor !== Array) ||
      (data.constructor === Object && !Object.keys(data).length) ||
      (data.constructor === Array && !data.length) ||
      (data.constructor === Array &&
        data.length &&
        !data.every(
          (item) =>
            item && item.constructor === Object && Object.keys(item).length
        ))
    ) {
      throw new Error("Parameter data is invalid.");
    }
  }

  async addChildren(id, data) {
    this.validateParams(id, data);
    try {
      const parent = await this.findNodeById(id);

      if (data.constructor === Object) {
        if (parent[this.organisations]) {
          parent[this.organisations].push(data);
        } else {
          parent[this.organisations] = [data];
        }
      } else {
        if (parent[this.organisations]) {
          parent[this.organisations].push(...data);
        } else {
          parent[this.organisations] = data;
        }
      }
    } catch (err) {
      console.log(err);
      throw new Error("Failed to add child nodes.");
    }
  }

  async addSiblings(id, data) {
    this.validateParams(id, data);

    try {
      const parent = await this.findParent(id);

      if (data.constructor === Object) {
        parent[this.organisations].push(data);
      } else {
        parent[this.organisations].push(...data);
      }
    } catch (err) {
      throw new Error("Failed to add sibling nodes.");
    }
  }

  addInitNode(data){
    if (
      !data ||
      data.constructor !== Object ||
      (data.constructor === Object && !Object.keys(data).length)
    ) {
      throw new Error("Parameter data is invalid.");
    }
    this.ds.organisations = [data];
  }

  addRoot(data) {
    if (
      !data ||
      data.constructor !== Object ||
      (data.constructor === Object && !Object.keys(data).length)
    ) {
      throw new Error("Parameter data is invalid.");
    }

    try {
      this.ds[this.organisations] = [Object.assign({}, this.ds)];
      delete data[this.organisations];
      Object.keys(this.ds)
        .filter((prop) => prop !== this.organisations)
        .forEach((prop) => {
          if (!data[prop]) {
            delete this.ds[prop];
          }
        });
      Object.assign(this.ds, data);
    } catch (err) {
      throw new Error("Failed to add root node.");
    }
  }

  async updateNode(data) {
    if (
      !data ||
      data.constructor !== Object ||
      (data.constructor === Object && !Object.keys(data).length) ||
      (data.constructor === Object &&
        Object.keys(data).length &&
        !data[this.id])
    ) {
      throw new Error("Parameter data is invalid.");
    }

    try {
      const node = await this.findNodeById(data[this.id]);
      Object.assign(node, data);
    } catch (err) {
      throw new Error("Failed to update node.");
    }
  }

  async updateNodes(ids, data) {
    const _this = this;

    if (!ids || (ids.constructor === Array && !ids.length) || !data) {
      throw new Error("Input parameter is invalid.");
    }

    try {
      for (const id of ids) {
        data[_this.id] = id;
        await this.updateNode(data);
      }
    } catch (err) {
      throw err;
    }
  } // remove single node based on id

  async removeNode(id) {
    const _this = this;

    if (id === this.ds[this.id]) {
      throw new Error("Input parameter is invalid.");
    }

    const parent = await this.findParent(id);
    const index = parent[this.organisations]
      .map((node) => node[_this.id])
      .indexOf(id);
    parent[this.organisations].splice(index, 1);
    this.count = 0;
  } // param could be single id, id array or conditions object

  async removeNodes(param) {
    const _this = this;

    if (
      !param ||
      (param.constructor === Array && !param.length) ||
      (param.constructor === Object && !Object.keys(param).length)
    ) {
      throw new Error("Input parameter is invalid.");
    }

    try {
      // if passing in single id
      if (param.constructor === String || param.constructor === Number) {
        await this.removeNode(param);
      } else if (param.constructor === Array) {
        // if passing in id array
        for (const p of param) {
          await this.removeNode(p);
        }
      } else {
        // if passing in conditions object
        const nodes = await this.findNodes(param);
        const ids = nodes.map((node) => node[_this.id]);

        for (const p of ids) {
          await this.removeNode(p);
        }
      }
    } catch (err) {
      throw new Error("Failed to remove nodes.");
    }
  }
}
