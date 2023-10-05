const express = require("express");
const path = require("path");

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const dbPath = path.join(__dirname, "todoApplication.db");
const app = express();

app.use(express.json());

const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");

const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");
var isValid = require("date-fns/isValid");

let db = "";

const initializeDatabaseAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server running successfully at http://localhost:3001/");
    });
  } catch (e) {
    console.log(`DB error ${e.message}`);
    process.exit(1);
  }
};
initializeDatabaseAndServer();

const priorityAndStatusDefined = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityDefined = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusDefined = (requestQuery) => {
  return requestQuery.status !== undefined;
};
const hasCategoryAndStatusDefined = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryDefined = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndPriority = (requestQuery) => {
  return requestQuery.category !== undefined && request.priority !== undefined;
};
const hasSearchDefined = (requestQuery) => {
  return requestQuery.search_q !== undefined;
};

const convertDatabaseIntoResponse = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

//API 1

app.get("/todos/", async (request, response) => {
  const { search_q = "", status, priority, category } = request.query;
  let todoQuery = "";
  let data = null;

  switch (true) {
    //scenario 1
    case hasStatusDefined(request.query):
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        todoQuery = `SELECT * FROM todo WHERE status='${status}';`;
        data = await db.all(todoQuery);
        response.send(data.map((each) => convertDatabaseIntoResponse(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    //Scenario 2

    case hasPriorityDefined(request.query):
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        todoQuery = `SELECT
               * FROM todo WHERE priority = '${priority}';  `;
        data = await db.all(todoQuery);
        response.send(data.map((each) => convertDatabaseIntoResponse(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    // scenario 3
    case priorityAndStatusDefined(request.query):
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        if (
          status === "TO DO" ||
          status === "IN PROGRESS" ||
          status === "DONE"
        ) {
          todoQuery = `SELECT * FROM todo WHERE priority ='${priority}' AND status='${status}';`;
          data = await db.all(todoQuery);
          response.send(data.map((each) => convertDatabaseIntoResponse(each)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    //scenario 4

    case hasSearchDefined(request.query):
      todoQuery = `SELECT * FROM todo WHERE todo like '%${search_q}%';`;
      data = await db.all(todoQuery);
      response.send(data.map((each) => convertDatabaseIntoResponse(each)));
      break;

    //Scenario 5
    case hasCategoryAndStatusDefined(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (
          status === "TO DO" ||
          status === "IN PROGRESS" ||
          status === "DONE"
        ) {
          todoQuery = `SELECT * FROM todo WHERE category='${category}' AND status='${status}';`;
          data = await db.all(todoQuery);
          response.send(data.map((each) => convertDatabaseIntoResponse(each)));
        } else {
          response.status(400);
          response.send("Invalid Todo status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;

    // Scenario 6

    case hasCategoryDefined(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        todoQuery = `SELECT * FROM 
                  todo WHERE category='${category}';`;
        data = await db.all(todoQuery);
        response.send(data.map((each) => convertDatabaseIntoResponse(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

    // scenario 7
    case hasCategoryAndPriority(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (
          priority === "HIGH" ||
          priority === "MEDIUM" ||
          priority === "LOW"
        ) {
          todoQuery = `SELECT * FROM todo WHERE category = '${category}' AND priority='${priority}';`;
          data = await db.all(todoQuery);
          response.send(data.map((each) => convertDatabaseIntoResponse(each)));
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    default:
      todoQuery = `
        SELECT * FROM todo;`;
      data = await db.all(todoQuery);
      response.send(data.map((each) => convertDatabaseIntoResponse(each)));

      break;
  }
});

//API 2
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const todoQueryId = `SELECT * FROM todo WHERE id =${todoId};`;
  const responseResult = await db.get(todoQueryId);
  response.send(convertDatabaseIntoResponse(responseResult));
});

//API 3
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isMatch(date, "yyyy-MM-dd")) {
    const newDate = format(new Date(date), "yyyy-MM-dd");

    const requestDateQuery = `SELECT * FROM todo WHERE due_date='${newDate}';`;
    const responseResult = await db.all(requestDateQuery);
    response.send(
      responseResult.map((each) => convertDatabaseIntoResponse(each))
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//API 4
app.post("/todos/", async (request, response) => {
  const { todoId } = request.params;
  const { todo, priority, status, category, dueDate } = request.body;
  const postQuery = `INSERT INTO todo (todo,priority,status,category,due_date)
    VALUES('${todo}','${priority}','${status}','${category}','${dueDate}')
    ;`;
  await db.run(postQuery);
  response.send("Todo Successfully Added");
});

//API 5
app.put("/todos/:todoId/", async (request, response) => {
  //scenario 1
  const { todoId } = request.params;

  const { status, priority, todo, category, dueDate } = request.body;

  if (status !== undefined) {
    const UpdateStatusQuery = `UPDATE todo SET status='${status}' WHERE id=${todoId};`;
    await db.run(UpdateStatusQuery);
    response.send("Status Updated");
  }

  //scenario 2
  else if (priority !== undefined) {
    const UpdatePriorityQuery = `UPDATE todo SET priority='${priority}' WHERE id=${todoId};`;
    await db.run(UpdatePriorityQuery);
    response.send("Priority Updated");
  }

  //scenario 3
  else if (todo !== undefined) {
    const UpdateTodoQuery = `UPDATE todo SET todo='${todo}' WHERE id=${todoId};`;
    await db.run(UpdateTodoQuery);
    response.send("Todo Updated");
  }

  //scenario 4
  else if (category !== undefined) {
    const UpdateCategoryQuery = `UPDATE todo SET category='${category}' WHERE id=${todoId};`;
    await db.run(UpdateCategoryQuery);
    response.send("Category Updated");
  }
  //scenario 5
  else if (dueDate !== undefined) {
    const UpdateDueQuery = `UPDATE todo SET due_date='${dueDate}' WHERE id=${todoId};`;
    await db.run(UpdateDueQuery);
    response.send("Due Date Updated");
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const DeleteTodoQuery = `DELETE  FROM todo WHERE id=${todoId};`;
  await db.run(DeleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
