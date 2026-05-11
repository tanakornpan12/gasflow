export function createElement(type, props, ...children) {
  return { type, props: props || {}, children: children.flat(3).filter((child) => child !== null && child !== false && child !== undefined) };
}

function setProps(node, props) {
  Object.entries(props || {}).forEach(([key, value]) => {
    if (key === "className") node.setAttribute("class", value);
    else if (key === "style" && typeof value === "string") node.setAttribute("style", value);
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, "");
    else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value);
  });
}

function toNode(vnode) {
  if (typeof vnode === "string" || typeof vnode === "number") return document.createTextNode(vnode);
  if (typeof vnode.type === "function") return toNode(vnode.type({ ...vnode.props, children: vnode.children }));
  const node = document.createElement(vnode.type);
  setProps(node, vnode.props);
  vnode.children.forEach((child) => node.appendChild(toNode(child)));
  return node;
}

export function render(vnode, container) {
  container.innerHTML = "";
  container.appendChild(toNode(vnode));
}
