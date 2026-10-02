(function () {
  var STORAGE_KEY = "week8-day4-research-tools";
  var state = { trails: [], stacks: [] };
  var trailList = document.getElementById("rabbit-hole-list");
  var stackList = document.getElementById("tab-stack-list");

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      state.trails = Array.isArray(saved.trails) ? saved.trails : [];
      state.stacks = Array.isArray(saved.stacks) ? saved.stacks : [];
    } catch (_) {
      state = { trails: [], stacks: [] };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (_) {
      return false;
    }
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function normalizeAddress(raw) {
    var value = String(raw || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) {
      try {
        var parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
      } catch (_) {
        return "";
      }
    }
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(?:[/?#].*)?$/i.test(value)) return "https://" + value;
    return "https://duckduckgo.com/?q=" + encodeURIComponent(value) + "&ia=web";
  }

  function makeElement(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeButton(label, action, id, index) {
    var button = makeElement("button", "quick-research-action", label);
    button.type = "button";
    button.dataset.researchAction = action;
    if (id) button.dataset.id = id;
    if (index !== undefined) button.dataset.index = String(index);
    return button;
  }

  function makeInput(name, placeholder, required) {
    var input = makeElement("input");
    input.name = name;
    input.placeholder = placeholder;
    input.autocomplete = "off";
    input.required = required;
    input.setAttribute("aria-label", placeholder);
    return input;
  }

  function showSaveError(list) {
    var message = list.querySelector("[data-save-error]");
    if (!message) {
      message = makeElement("p", "quick-tool-status");
      message.dataset.saveError = "true";
      message.setAttribute("role", "status");
      list.prepend(message);
    }
    message.textContent = "Browser storage is unavailable; changes may not persist.";
  }

  function persistAndRender() {
    var saved = saveState();
    renderTrails();
    renderStacks();
    if (!saved) {
      showSaveError(trailList);
      showSaveError(stackList);
    }
  }

  function renderEmpty(list, message) {
    list.appendChild(makeElement("p", "quick-research-empty", message));
  }

  function renderItems(list, group, kind) {
    var items = makeElement("ul", "quick-research-items");
    group.items.forEach(function (item, index) {
      var row = makeElement("li", "quick-research-item");
      var copy = document.createElement("div");
      copy.appendChild(makeElement("strong", "", item.title));
      if (item.note) copy.appendChild(makeElement("small", "", item.note));
      var actions = document.createElement("div");
      actions.className = "quick-tool-row";
      var open = makeButton("Open", "open", group.id, index);
      open.dataset.url = item.url;
      var remove = makeButton("Remove", "remove-item", group.id, index);
      remove.dataset.kind = kind;
      actions.append(open, remove);
      row.append(copy, actions);
      items.appendChild(row);
    });
    list.appendChild(items);
  }

  function makeAddForm(kind, group) {
    var form = makeElement("form", "quick-research-form");
    form.dataset.researchForm = kind === "trail" ? "hop" : "tab";
    form.dataset.id = group.id;
    form.appendChild(makeInput("title", kind === "trail" ? "Link or hop title" : "Tab title", false));
    form.appendChild(makeInput("url", "URL or search phrase", true));
    if (kind === "trail") form.appendChild(makeInput("note", "Why is it interesting? (optional)", false));
    var submit = makeElement("button", "quick-research-action", kind === "trail" ? "Add hop" : "Save tab");
    submit.type = "submit";
    form.appendChild(submit);
    return form;
  }

  function renderTrails() {
    trailList.replaceChildren();
    if (!state.trails.length) {
      renderEmpty(trailList, "Start a topic, then keep the interesting links and notes you find along the way.");
      return;
    }
    state.trails.forEach(function (trail) {
      var card = makeElement("article", "quick-research-card");
      var heading = makeElement("div", "quick-research-heading");
      var title = document.createElement("div");
      title.appendChild(makeElement("strong", "", trail.topic));
      title.appendChild(makeElement("small", "", trail.items.length + (trail.items.length === 1 ? " hop" : " hops")));
      heading.append(title, makeButton("Delete", "delete-trail", trail.id));
      card.appendChild(heading);

      var suggestions = makeElement("div", "quick-research-suggestions");
      ["history", "how it works", "surprising facts"].forEach(function (suffix) {
        var button = makeButton(suffix, "suggest", trail.id);
        button.dataset.query = trail.topic + " " + suffix;
        suggestions.appendChild(button);
      });
      card.appendChild(suggestions);
      renderItems(card, trail, "trail");
      card.appendChild(makeAddForm("trail", trail));
      trailList.appendChild(card);
    });
  }

  function renderStacks() {
    stackList.replaceChildren();
    if (!state.stacks.length) {
      renderEmpty(stackList, "Create a stack for a class, project, or anything you want to pick up later.");
      return;
    }
    state.stacks.forEach(function (stack) {
      var card = makeElement("article", "quick-research-card");
      var heading = makeElement("div", "quick-research-heading");
      var title = document.createElement("div");
      title.appendChild(makeElement("strong", "", stack.name));
      title.appendChild(makeElement("small", "", stack.items.length + (stack.items.length === 1 ? " saved tab" : " saved tabs")));
      heading.append(title, makeButton("Delete", "delete-stack", stack.id));
      card.appendChild(heading);
      if (stack.items.length) renderItems(card, stack, "stack");
      else card.appendChild(makeElement("p", "quick-research-empty", "This stack is empty. Add a link below."));
      card.appendChild(makeAddForm("stack", stack));
      stackList.appendChild(card);
    });
  }

  function submitForm(form) {
    var values = new FormData(form);
    var kind = form.dataset.researchForm;
    if (kind === "trail") {
      var topic = String(values.get("topic") || "").trim();
      if (!topic) return;
      state.trails.unshift({
        id: makeId(),
        topic: topic,
        items: [{ title: topic, url: normalizeAddress(topic), note: "Starting point" }]
      });
    } else if (kind === "stack") {
      var name = String(values.get("name") || "").trim();
      if (!name) return;
      state.stacks.unshift({ id: makeId(), name: name, items: [] });
    } else if (kind === "hop" || kind === "tab") {
      var groups = kind === "hop" ? state.trails : state.stacks;
      var group = groups.find(function (entry) { return entry.id === form.dataset.id; });
      var url = normalizeAddress(values.get("url"));
      if (!group || !url) return;
      var titleValue = String(values.get("title") || "").trim();
      group.items.push({
        title: titleValue || String(values.get("url") || "").trim(),
        url: url,
        note: kind === "hop" ? String(values.get("note") || "").trim() : ""
      });
    }
    persistAndRender();
  }

  function handleAction(event) {
    var button = event.target.closest("[data-research-action]");
    if (!button) return;
    var id = button.dataset.id;
    var action = button.dataset.researchAction;
    if (action === "open") {
      var group = state.trails.concat(state.stacks).find(function (entry) { return entry.id === id; });
      var item = group && group.items[Number(button.dataset.index)];
      if (item && typeof openProxy === "function") {
        document.querySelector(".quick-tools").open = false;
        openProxy(item.url);
      }
      return;
    }
    if (action === "suggest") {
      var trail = state.trails.find(function (entry) { return entry.id === id; });
      var query = button.dataset.query;
      if (trail && query) trail.items.push({ title: query, url: normalizeAddress(query), note: "Suggested next search" });
    } else if (action === "delete-trail") {
      state.trails = state.trails.filter(function (entry) { return entry.id !== id; });
    } else if (action === "delete-stack") {
      state.stacks = state.stacks.filter(function (entry) { return entry.id !== id; });
    } else if (action === "remove-item") {
      var groups = button.dataset.kind === "trail" ? state.trails : state.stacks;
      var selected = groups.find(function (entry) { return entry.id === id; });
      if (selected) selected.items.splice(Number(button.dataset.index), 1);
    } else {
      return;
    }
    persistAndRender();
  }

  document.querySelector(".quick-tools-panel").addEventListener("submit", function (event) {
    var form = event.target.closest("[data-research-form]");
    if (!form) return;
    event.preventDefault();
    submitForm(form);
  });
  trailList.addEventListener("click", handleAction);
  stackList.addEventListener("click", handleAction);
  loadState();
  renderTrails();
  renderStacks();
})();
