(function () {
  var STORAGE_KEY = "week8-day4-research-tools";
  var state = { trails: [], stacks: [] };
  var trailList = document.getElementById("trail-list");
  var stackList = document.getElementById("stack-list");
  var status = document.getElementById("tool-status");

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
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makeButton(label, action, id, index) {
    var button = makeElement("button", "subtle-button", label);
    button.type = "button";
    button.dataset.action = action;
    if (id) button.dataset.id = id;
    if (index !== undefined) button.dataset.index = String(index);
    return button;
  }

  function readState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      state.trails = Array.isArray(saved.trails) ? saved.trails : [];
      state.stacks = Array.isArray(saved.stacks) ? saved.stacks : [];
      state.trails.forEach(function (trail) {
        if (!trail.id) trail.id = makeId();
        if (!Array.isArray(trail.items)) trail.items = [];
        trail.items = trail.items.filter(function (item) {
          if (!item || typeof item !== "object") return false;
          item.url = normalizeAddress(item.url);
          return Boolean(item.url);
        });
      });
      state.stacks.forEach(function (stack) {
        if (!stack.id) stack.id = makeId();
        if (!Array.isArray(stack.items)) stack.items = [];
        stack.items = stack.items.filter(function (item) {
          if (!item || typeof item !== "object") return false;
          item.url = normalizeAddress(item.url);
          return Boolean(item.url);
        });
      });
    } catch (_) {
      state = { trails: [], stacks: [] };
      status.textContent = "Saved tools could not be read in this browser.";
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      status.textContent = "Saved in this browser.";
    } catch (_) {
      status.textContent = "Browser storage is unavailable; changes may not persist.";
    }
  }

  function addEntry(list, group, item, kind, index) {
    var row = makeElement("li", "saved-entry");
    var copy = makeElement("div", "entry-copy");
    var open = makeElement("a", "", item.title || item.url);
    open.href = normalizeAddress(item.url);
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    copy.appendChild(open);
    if (item.note) copy.appendChild(makeElement("small", "", item.note));
    var actions = makeElement("div", "entry-actions");
    if (kind === "stack") {
      var up = makeButton("↑", "move", group.id, index);
      up.dataset.direction = "-1";
      up.setAttribute("aria-label", "Move " + (item.title || "link") + " up");
      up.title = "Move up";
      var down = makeButton("↓", "move", group.id, index);
      down.dataset.direction = "1";
      down.setAttribute("aria-label", "Move " + (item.title || "link") + " down");
      down.title = "Move down";
      actions.append(up, down);
    }
    actions.appendChild(makeButton("Remove", "remove-entry", group.id, index));
    row.append(copy, actions);
    list.appendChild(row);
  }

  function makeEntryForm(kind, group) {
    var form = makeElement("form", "entry-form" + (kind === "trail" ? " has-note" : ""));
    form.dataset.form = kind === "trail" ? "hop" : "tab";
    form.dataset.id = group.id;
    var title = makeElement("input");
    title.name = "title";
    title.placeholder = kind === "trail" ? "Link title" : "Tab name";
    title.setAttribute("aria-label", title.placeholder);
    var url = makeElement("input");
    url.name = "url";
    url.placeholder = "URL or search phrase";
    url.required = true;
    url.setAttribute("aria-label", "URL or search phrase");
    form.append(title, url);
    if (kind === "trail") {
      var note = makeElement("textarea");
      note.name = "note";
      note.placeholder = "What made this worth following? (optional)";
      note.setAttribute("aria-label", note.placeholder);
      form.appendChild(note);
    }
    var submit = makeElement("button", "primary-button", kind === "trail" ? "Add hop +" : "Save tab +");
    submit.type = "submit";
    form.appendChild(submit);
    return form;
  }

  function renderEmpty(list, text) {
    list.appendChild(makeElement("p", "empty-state", text));
  }

  function renderTrails() {
    trailList.replaceChildren();
    if (!state.trails.length) {
      renderEmpty(trailList, "No trails yet. Start with something you have always wondered about.");
      return;
    }
    state.trails.forEach(function (trail) {
      var card = makeElement("article", "saved-card");
      var heading = makeElement("div", "saved-heading");
      var titleBlock = document.createElement("div");
      titleBlock.appendChild(makeElement("h3", "", trail.topic || "Untitled trail"));
      titleBlock.appendChild(makeElement("p", "", trail.items.length + (trail.items.length === 1 ? " hop" : " hops")));
      heading.append(titleBlock, makeButton("Delete trail", "delete-trail", trail.id));
      card.appendChild(heading);

      var suggestions = makeElement("div", "suggestions");
      ["history", "how it works", "surprising facts"].forEach(function (suffix) {
        var suggestion = makeElement("button", "suggestion-button", "Explore " + suffix);
        suggestion.type = "button";
        suggestion.dataset.action = "suggest";
        suggestion.dataset.id = trail.id;
        suggestion.dataset.query = trail.topic + " " + suffix;
        suggestions.appendChild(suggestion);
      });
      card.appendChild(suggestions);

      var entries = makeElement("ul", "entry-list");
      trail.items.forEach(function (item, index) { addEntry(entries, trail, item, "trail", index); });
      card.append(entries, makeEntryForm("trail", trail));
      trailList.appendChild(card);
    });
  }

  function renderStacks() {
    stackList.replaceChildren();
    if (!state.stacks.length) {
      renderEmpty(stackList, "No stacks yet. Make one for a class, project, or your next big question.");
      return;
    }
    state.stacks.forEach(function (stack) {
      var card = makeElement("article", "saved-card");
      var heading = makeElement("div", "saved-heading");
      var titleBlock = document.createElement("div");
      titleBlock.appendChild(makeElement("h3", "", stack.name || "Untitled stack"));
      titleBlock.appendChild(makeElement("p", "", stack.items.length + (stack.items.length === 1 ? " saved tab" : " saved tabs")));
      heading.append(titleBlock, makeButton("Delete stack", "delete-stack", stack.id));
      card.appendChild(heading);
      if (stack.items.length) {
        var entries = makeElement("ul", "entry-list");
        stack.items.forEach(function (item, index) { addEntry(entries, stack, item, "stack", index); });
        card.appendChild(entries);
      } else {
        card.appendChild(makeElement("p", "empty-state", "Add a link to get this stack going."));
      }
      card.appendChild(makeEntryForm("stack", stack));
      stackList.appendChild(card);
    });
  }

  function render() {
    renderTrails();
    renderStacks();
  }

  function handleSubmit(event) {
    var form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    var values = new FormData(form);
    var kind = form.dataset.form;
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
      var rawUrl = String(values.get("url") || "").trim();
      var url = normalizeAddress(rawUrl);
      if (!group || !url) return;
      var rawTitle = String(values.get("title") || "").trim();
      group.items.push({
        title: rawTitle || rawUrl,
        url: url,
        note: kind === "hop" ? String(values.get("note") || "").trim() : ""
      });
    }
    persist();
    render();
  }

  function handleAction(event) {
    var button = event.target.closest("[data-action]");
    if (!button) return;
    var id = button.dataset.id;
    if (button.dataset.action === "delete-trail") {
      state.trails = state.trails.filter(function (trail) { return trail.id !== id; });
    } else if (button.dataset.action === "delete-stack") {
      state.stacks = state.stacks.filter(function (stack) { return stack.id !== id; });
    } else if (button.dataset.action === "remove-entry") {
      var collections = event.currentTarget === trailList ? state.trails : state.stacks;
      var collection = collections.find(function (entry) { return entry.id === id; });
      if (collection) collection.items.splice(Number(button.dataset.index), 1);
    } else if (button.dataset.action === "move") {
      var stack = state.stacks.find(function (entry) { return entry.id === id; });
      var index = Number(button.dataset.index);
      var nextIndex = index + Number(button.dataset.direction);
      if (!stack || nextIndex < 0 || nextIndex >= stack.items.length) return;
      var moved = stack.items.splice(index, 1)[0];
      stack.items.splice(nextIndex, 0, moved);
    } else if (button.dataset.action === "suggest") {
      var trail = state.trails.find(function (entry) { return entry.id === id; });
      var query = button.dataset.query;
      if (!trail || !query) return;
      trail.items.push({ title: query, url: normalizeAddress(query), note: "Suggested next search" });
    } else {
      return;
    }
    persist();
    render();
  }

  document.querySelectorAll("[data-view]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var selected = tab.dataset.view;
      document.querySelectorAll("[data-view]").forEach(function (button) {
        var active = button.dataset.view === selected;
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
      });
      document.querySelectorAll(".tool-view").forEach(function (view) {
        view.hidden = view.id !== selected + "-view";
      });
    });
    tab.addEventListener("keydown", function (event) {
      var direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!direction) return;
      event.preventDefault();
      var tabs = Array.from(document.querySelectorAll("[data-view]"));
      var index = tabs.indexOf(tab);
      var nextTab = tabs[(index + direction + tabs.length) % tabs.length];
      nextTab.focus();
      nextTab.click();
    });
  });

  document.querySelector(".tool-shell").addEventListener("submit", handleSubmit);
  trailList.addEventListener("click", handleAction);
  stackList.addEventListener("click", handleAction);
  readState();
  render();
})();
