/*

* Reorder the todos...
* Include a link to the (annotated) source code.

*/

(function(){

  _.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g
  };

  // Todo
  window.Todo = Backbone.Model.extend({
  
  });

  // Todo List
  window.TodoList = Backbone.Collection.extend({
  
    model: Todo,
    localStore: new Store("tasks"),
  
    // Returns all done todos.
    done: function() {
      return this.select(function(todo){
        return todo.get('done');
      });
    },
    
    comparator: function(todo) {
      return todo.get("order")
    }
  
  });

  window.Todos = new TodoList;
  
  window.TodoView = Backbone.View.extend({
  
    tagName: "li",
    className: "todo",
  
    template: _.template("<input type='checkbox' /><div class='todo-content'>{{ content }}</div><span class='todo-destroy'></span>"),
    editTemplate: _.template("<input type='text' value='{{ content }}' />"),
  
    events: {
      "click input[type=checkbox]": "markAsDone",
      "dblclick div.todo-content" : "edit",
      "click span.todo-destroy"   : "destroy",
      "keypress input[type=text]" : "changed"
    },
    
    initialize: function() {
      _.bindAll(this, 'toggleDone');
      this.model.bind('change:done', this.toggleDone);
      this.handleEvents();
    },
  
    render: function() {
      $(this.el).set('html', this.template(this.model.toJSON()));
      $(this.el).setProperty("id", "todo-"+this.model.get("id"));
      this.checkbox = $(this.el).getFirst("input[type=checkbox]");
      this.toggleDone();
      return this;
    },
  
    toggleDone: function() {      
      if (this.model.get('done')) {
        $(this.el).addClass("done");
        this.checkbox.setProperty("checked", "checked");
      } else {
        $(this.el).removeClass("done");
        this.checkbox.removeProperty("checked");
      }
    },
    
    markAsDone: function() {
      this.model.save({ done: !this.model.get("done") });
    },
  
    edit: function() {
      $(this.el).set('html', this.editTemplate(this.model.toJSON()));
      $(this.el).addClass("editing");
      this.updateInput = $(this.el).getFirst("input[type=text]");
      sortableTodos.detach();
    },
  
    changed: function(e) {
      console.log(e);
      if (e.code == 13) {
        var thisView = this;
        this.model.save(
          {
            content: this.updateInput.get("value")
          },
          {
            success: function(todo) {
              thisView.render();
              $(thisView.el).removeClass("editing");
              sortableTodos.attach();
              sortableTodos.addItems(thisView.el);
            }
          }
        );
      }
    },
    
    destroy: function() {
      var thisView = this;
      this.model.destroy({
        success: function(){
          $(thisView.el).dispose();
        }
      });
    }
  
  });

  var sortableTodos = new Sortables("todo-list", {
    constrain: true,
    clone: true,
    handle: '.handle',
    onComplete: function(ele){
      sortableTodos.serialize(false, function(element, index){
        todo = Todos.get(element.getProperty("id").replace("todo-", ""));
        todo.save({"order": index});
      });
    }
  });

  window.AppView = Backbone.View.extend({
  
    el: $("todoapp"),
  
    events: {
      "keypress input#new-todo": "createIfEnter",
      "keyup input#new-todo"   : "showTooltip",
      "click span.todo-clear"  : "clearCompleted"
    },
  
    initialize: function() {
      _.bindAll(this, 'addTodo', 'clearCompleted', 'showTooltip', 'createIfEnter', 'analyzeTodos');
    
      this.handleEvents();
    
      Todos.bind('add', this.addTodo);
    
      this.list = $("todo-list");
      this.newInput = $("new-todo");
      this.tooltip = $(this.el).getElements(".ui-tooltip-top")[0];
      this.clearLink = this.$("span.todo-clear");
      this.todosCountContainer = this.$("span.todo-count");
      this.todosCount = this.$("span.todo-count .number");
    
      var addTodoProxy = this.addTodo;
      Todos.fetch({
        success: function(coll) {
          todos = coll.models;
          _.each(todos, function(todo) {
            addTodoProxy(todo)
          });
        }
      });
      
      this.analyzeTodos();
      
      Todos.bind("add", this.analyzeTodos);
      Todos.bind("remove", this.analyzeTodos);
      Todos.bind("change", this.analyzeTodos);
    },
    
    analyzeTodos: function() {
      var doneCount = Todos.done().length;
      var todoCount = Todos.length;
      
      var totalCount = todoCount - doneCount;
      
      if (todoCount > 0) {
        this.todosCountContainer.set({styles: {display: "inline"}});
        this.todosCount.set("html", totalCount);
      } else {
        this.todosCountContainer.set({styles: {display: "none"}});
      }
      
      if (doneCount > 0) {
        this.clearLink.set({styles: {display: "inline"}});
      } else {
        this.clearLink.set({styles: {display: "none"}});
      }
    },
  
    addTodo: function(todo) {
      var view = new TodoView({model: todo});
      this.list.grab(view.render().el);
      sortableTodos.addItems(view.el);
      sortableTodos.serialize(false, function(element, index){
        todo = Todos.get(element.getProperty("id").replace("todo-", ""));
        todo.save({"order": index});
      });
    },
  
    createIfEnter: function(e) {
      if (e.code == 13) {
        Todos.create({
          content: this.newInput.getProperty("value"),
          done: false
        });
        this.newInput.setProperty("value", "");
      }
    },
  
    showTooltip: function(e) {
      this.tooltip.fade("out");
    
      if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
    
      var tt = this.tooltip;
    
      if (this.newInput.getProperty("value") !== "" && this.newInput.getProperty("value") !== this.newInput.getProperty("placeholder")) {
        this.tooltipTimeout = setTimeout(function(){
          tt.fade("in");
        }, 1000);
      }
    },
    
    clearCompleted: function() {
      thisView = this;
      _.each(Todos.done(), function(todo){
        todo.destroy({success: function(todo){
          thisView.$("#todo-"+todo.id).dispose();
        }});
      });
    }
  
  });

  window.App = new AppView;

}());