#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(process.cwd(), 'tasks.json');
const VALID_STATUSES = ['todo', 'in-progress', 'done'];

function printHelp() {
  console.log(`Task Tracker CLI

Usage:
  task-cli add "Task description"
  task-cli update <id> "Updated description"
  task-cli delete <id>
  task-cli mark-in-progress <id>
  task-cli mark-done <id>
  task-cli list
  task-cli list done
  task-cli list todo
  task-cli list in-progress

Notes:
  - Tasks are stored in a file named tasks.json in the current directory.
  - If the file does not exist, it will be created automatically.
  `);
}

function ensureStorageFile() {
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, '[]', 'utf8');
  }
}

function readTasks() {
  try {
    ensureStorageFile();
    const raw = fs.readFileSync(STORAGE_FILE, 'utf8').trim();

    if (!raw) {
      fs.writeFileSync(STORAGE_FILE, '[]', 'utf8');
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('The tasks file must contain a JSON array.');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Unable to read tasks from ${STORAGE_FILE}: ${error.message}`);
  }
}

function saveTasks(tasks) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(tasks, null, 2));
  } catch (error) {
    throw new Error(`Unable to save tasks to ${STORAGE_FILE}: ${error.message}`);
  }
}

function parseTaskId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Task ID must be a positive integer.');
  }

  return id;
}

function findTask(id, tasks) {
  return tasks.find((task) => task.id === id);
}

function addTask(description) {
  const trimmedDescription = description.trim();

  if (!trimmedDescription) {
    throw new Error('Task description cannot be empty.');
  }

  const tasks = readTasks();
  const nextId = tasks.length > 0 ? Math.max(...tasks.map((task) => task.id)) + 1 : 1;
  const now = new Date().toISOString();

  tasks.push({
    id: nextId,
    description: trimmedDescription,
    status: 'todo',
    createdAt: now,
    updatedAt: now,
  });

  saveTasks(tasks);
  console.log(`Task added successfully (ID: ${nextId})`);
}

function updateTask(id, description) {
  const trimmedDescription = description.trim();

  if (!trimmedDescription) {
    throw new Error('Updated task description cannot be empty.');
  }

  const tasks = readTasks();
  const task = findTask(id, tasks);

  if (!task) {
    throw new Error(`Task with ID ${id} was not found.`);
  }

  task.description = trimmedDescription;
  task.updatedAt = new Date().toISOString();

  saveTasks(tasks);
  console.log(`Task updated successfully (ID: ${id})`);
}

function deleteTask(id) {
  const tasks = readTasks();
  const index = tasks.findIndex((task) => task.id === id);

  if (index === -1) {
    throw new Error(`Task with ID ${id} was not found.`);
  }

  tasks.splice(index, 1);
  saveTasks(tasks);
  console.log(`Task deleted successfully (ID: ${id})`);
}

function setStatus(id, status) {
  const tasks = readTasks();
  const task = findTask(id, tasks);

  if (!task) {
    throw new Error(`Task with ID ${id} was not found.`);
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}. Use one of: ${VALID_STATUSES.join(', ')}`);
  }

  task.status = status;
  task.updatedAt = new Date().toISOString();
  saveTasks(tasks);
  console.log(`Task ${id} marked as ${status}.`);
}

function listTasks(statusFilter = null) {
  const tasks = readTasks();
  const filteredTasks = statusFilter
    ? tasks.filter((task) => task.status === statusFilter)
    : tasks;

  if (filteredTasks.length === 0) {
    console.log(statusFilter ? `No tasks found with status: ${statusFilter}` : 'No tasks found.');
    return;
  }

  console.log('ID | Status | Description | Created At | Updated At');
  console.log('---|--------|-------------|------------|------------');

  filteredTasks.forEach((task) => {
    console.log(`${task.id} | ${task.status} | ${task.description} | ${task.createdAt} | ${task.updatedAt}`);
  });
}

function main() {
  const [,, command, ...args] = process.argv;

  if (!command) {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'add': {
        if (args.length === 0) {
          throw new Error('Missing task description. Usage: task-cli add "Task description"');
        }

        addTask(args.join(' '));
        break;
      }

      case 'update': {
        if (args.length < 2) {
          throw new Error('Usage: task-cli update <id> "Updated description"');
        }

        const id = parseTaskId(args[0]);
        updateTask(id, args.slice(1).join(' '));
        break;
      }

      case 'delete': {
        if (args.length !== 1) {
          throw new Error('Usage: task-cli delete <id>');
        }

        deleteTask(parseTaskId(args[0]));
        break;
      }

      case 'mark-in-progress': {
        if (args.length !== 1) {
          throw new Error('Usage: task-cli mark-in-progress <id>');
        }

        setStatus(parseTaskId(args[0]), 'in-progress');
        break;
      }

      case 'mark-done': {
        if (args.length !== 1) {
          throw new Error('Usage: task-cli mark-done <id>');
        }

        setStatus(parseTaskId(args[0]), 'done');
        break;
      }

      case 'list': {
        if (args.length > 1) {
          throw new Error('Usage: task-cli list [done|todo|in-progress]');
        }

        const filter = args[0] ? args[0].toLowerCase() : null;

        if (filter && !VALID_STATUSES.includes(filter)) {
          throw new Error(`Invalid list filter: ${filter}. Use one of: ${VALID_STATUSES.join(', ')}`);
        }

        listTasks(filter);
        break;
      }

      case '--help':
      case '-h':
      case 'help': {
        printHelp();
        break;
      }

      default: {
        throw new Error(`Unknown command: ${command}`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  addTask,
  updateTask,
  deleteTask,
  setStatus,
  listTasks,
  readTasks,
  saveTasks,
  parseTaskId,
};