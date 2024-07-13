export const REPO_TAGS = [
  'react',
  'typescript',
  'tailwindcss',
  'react-hooks',
  'redux',
  'react-router',
  'nextjs',
  'gatsby',
  'create-react-app',
  'react-context',
  'redux-toolkit',
  'react-redux',
  'graphql',
  'apollo-client',
  'react-testing-library',
  'jest',
  'formik',
  'react-query',
  'material-ui',
  'chakra-ui',
  'ant-design',
  'emotion',
  'styled-components',
  'css-in-js',
  'eslint',
  'prettier',
  'vite',
  'webpack',
  'babel',
  'storybook',
  'react-spring',
  'framer-motion',
  'react-native',
  'expo',
  'react-navigation',
  'react-i18next',
  'react-dnd',
  'react-beautiful-dnd',
  'react-final-form',
  'react-hook-form',
  'react-snapshot',
  'react-window',
  'react-virtualized',
  'react-table',
  'react-data-grid',
  'react-icons',
  'react-select',
  'react-autosuggest',
  'react-dropzone',
  'react-toastify',
  'react-error-boundary',
  'react-hot-toast',
  'react-infinite-scroll',
  'react-intersection-observer',
  'react-use',
  'react-swipeable',
  'react-player',
  'react-helmet',
  'react-ga',
  'react-markdown',
  'react-slick',
  'react-stripe-js',
  'react-use-gesture',
  'react-three-fiber',
  'zustand',
  'recoil',
  'jotai',
  'react-query-devtools',
  'msw',
  'react-apexcharts',
  'react-chartjs-2',
  'nivo',
  'react-sparklines',
  'react-leaflet',
  'react-google-maps',
  'react-map-gl',
  'react-geosuggest',
  'react-rnd',
  'react-split-pane',
  'react-pdf',
  'react-move',
  'react-use-measure',
  'react-gsap',
  'react-icons-kit',
  'react-vertical-timeline',
  'react-parallax',
  'react-transition-group',
  'react-motion',
  'react-flip-move',
  'react-responsive',
  'react-dates',
  'react-moment',
  'react-intl',
  'react-spring-lightbox',
  'react-popper',
  'react-tooltip',
  'react-lottie',
  'react-smooth-dnd',
  'react-slider',
  'react-datetime',
  'react-collapse',
  'react-photo-gallery',
]

export const QUIZ_APP_CSS = `
.quiz-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  background-color: #1a1a1a;
  color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
}

h1 {
  text-align: center;
  color: #bb86fc;
}

h2 {
  color: #03dac6;
}

.question {
  font-size: 1.2em;
  margin-bottom: 20px;
}

.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.option-btn {
  background-color: #3700b3;
  color: #ffffff;
  border: none;
  padding: 10px;
  font-size: 1em;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.3s;
}

.option-btn:hover {
  background-color: #6200ee;
}

.option-btn.selected {
  background-color: #018786;
}

.next-btn, .restart-btn {
  background-color: #bb86fc;
  color: #000000;
  border: none;
  padding: 10px 20px;
  font-size: 1em;
  cursor: pointer;
  border-radius: 5px;
  margin-top: 20px;
  transition: background-color 0.3s;
}

.next-btn:hover, .restart-btn:hover {
  background-color: #3700b3;
  color: #ffffff;
}

.next-btn:disabled {
  background-color: #4f4f4f;
  cursor: not-allowed;
}

.score-section {
  text-align: center;
}

.score-section p {
  font-size: 1.2em;
  margin-bottom: 20px;
}
`

export const QUIZ_APP = `

import React from "react"
import render from "react-dom"

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
}

const QuizApp = () => {
  const [questions, setQuestions] = React.useState<Question[]>([
    {
      id: 1,
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: "Paris"
    },
    {
      id: 2,
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correctAnswer: "Mars"
    },
    {
      id: 3,
      question: "Who painted the Mona Lisa?",
      options: ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"],
      correctAnswer: "Leonardo da Vinci"
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = React.useState<number>(0);
  const [score, setScore] = React.useState<number>(0);
  const [showScore, setShowScore] = React.useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = React.useState<string>("");

  const handleAnswerClick = (answer: string): void => {
    setSelectedAnswer(answer);
  };

  const handleNextQuestion = (): void => {
    if (selectedAnswer === questions[currentQuestion].correctAnswer) {
      setScore(prevScore => prevScore + 1);
    }

    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion);
      setSelectedAnswer("");
    } else {
      setShowScore(true);
    }
  };

  const restartQuiz = (): void => {
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
    setSelectedAnswer("");
  };

  return (
    <div className="quiz-container">
      <h1>Quiz App</h1>
      {showScore ? (
        <div className="score-section">
          <h2>Quiz Completed!</h2>
          <p>Your score: {score} out of {questions.length}</p>
          <button onClick={restartQuiz} className="restart-btn">Restart Quiz</button>
        </div>
      ) : (
        <div className="question-section">
          <h2>Question {currentQuestion + 1}/{questions.length}</h2>
          <p className="question">{questions[currentQuestion].question}</p>
          <div className="options">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerClick(option)}
                className={\`option-btn \${selectedAnswer === option ? 'selected' : ''}\`}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            onClick={handleNextQuestion}
            disabled={!selectedAnswer}
            className="next-btn"
          >
            {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
};

render(<QuizApp />);
`

// TSX Variant

export const KANBAN = `
import React from "react"
import render from "react-dom"


interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'To Do' | 'In Progress' | 'Done';
  dueDate: string;
}

const KanbanBoard = () => {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [newTask, setNewTask] = React.useState<Omit<Task, 'id' | 'status'>>({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: ''
  });

  const addTask = () => {
    if (newTask.title && newTask.description && newTask.dueDate) {
      setTasks([...tasks, { ...newTask, id: Date.now(), status: 'To Do' }]);
      setNewTask({ title: '', description: '', priority: 'Medium', dueDate: '' });
    }
  };

  const moveTask = (taskId: number, newStatus: 'To Do' | 'In Progress' | 'Done') => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const getPriorityColor = (priority: 'Low' | 'Medium' | 'High') => {
    switch (priority) {
      case 'Low': return 'bg-green-600';
      case 'Medium': return 'bg-yellow-600';
      case 'High': return 'bg-red-600';
    }
  };

  const renderTaskList = (status: 'To Do' | 'In Progress' | 'Done') => (
    <div className="bg-gray-800 p-4 rounded-lg flex-1">
      <h2 className="text-xl font-bold mb-4">{status}</h2>
      {tasks.filter(task => task.status === status).map(task => (
        <div key={task.id} className="bg-gray-700 p-3 rounded mb-2">
          <h3 className="font-semibold">{task.title}</h3>
          <p className="text-sm text-gray-400">{task.description}</p>
          <div className="flex justify-between items-center mt-2">
            <span className={\`px-2 py-1 rounded text-xs \${getPriorityColor(task.priority)}\`}>
              {task.priority}
            </span>
            <span className="text-xs text-gray-500">{task.dueDate}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <select
              value={task.status}
              onChange={(e) => moveTask(task.id, e.target.value as 'To Do' | 'In Progress' | 'Done')}
              className="p-1 bg-gray-600 rounded text-sm"
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
            <button
              onClick={() => deleteTask(task.id)}
              className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-gray-900 text-white p-8 rounded-xl shadow-2xl">
      <h1 className="text-3xl font-bold mb-6">Kanban Board</h1>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <input
          type="text"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          className="p-2 bg-gray-800 rounded"
          placeholder="Task Title"
        />
        <input
          type="date"
          value={newTask.dueDate}
          onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
          className="p-2 bg-gray-800 rounded"
        />
      </div>
      <textarea
        value={newTask.description}
        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
        className="p-2 bg-gray-800 rounded w-full mb-4"
        placeholder="Task Description"
      />
      <div className="flex justify-between items-center mb-4">
        <select
          value={newTask.priority}
          onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
          className="p-2 bg-gray-800 rounded"
        >
          <option value="Low">Low Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="High">High Priority</option>
        </select>
        <button
          onClick={addTask}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
        >
          Add Task
        </button>
      </div>
      <div className="flex space-x-4">
        {renderTaskList('To Do')}
        {renderTaskList('In Progress')}
        {renderTaskList('Done')}
      </div>
    </div>
  );
};

render(<KanbanBoard />);
`;

export const KANBAN_CSS = `
/* No additional CSS needed as styles are handled by Tailwind */
`;

export const PROJECT_MANAGEMENT = `
import React from "react"
import render from "react-dom"


interface Project {
  id: number;
  name: string;
  description: string;
  status: 'To Do' | 'In Progress' | 'Completed';
  dueDate: string;
}

const ProjectManagement = () => {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [newProject, setNewProject] = React.useState<Omit<Project, 'id'>>({
    name: '',
    description: '',
    status: 'To Do',
    dueDate: ''
  });
  const [filter, setFilter] = React.useState<'To Do' | 'In Progress' | 'Completed' | 'All'>('All');

  const addProject = () => {
    if (newProject.name && newProject.description && newProject.dueDate) {
      setProjects([...projects, { ...newProject, id: Date.now() }]);
      setNewProject({ name: '', description: '', status: 'To Do', dueDate: '' });
    }
  };

  const updateProjectStatus = (id: number, newStatus: 'To Do' | 'In Progress' | 'Completed') => {
    setProjects(projects.map(project =>
      project.id === id ? { ...project, status: newStatus } : project
    ));
  };

  const deleteProject = (id: number) => {
    setProjects(projects.filter(project => project.id !== id));
  };

  const filteredProjects = filter === 'All'
    ? projects
    : projects.filter(project => project.status === filter);

  const getStatusColor = (status: 'To Do' | 'In Progress' | 'Completed') => {
    switch (status) {
      case 'To Do': return 'bg-yellow-600';
      case 'In Progress': return 'bg-blue-600';
      case 'Completed': return 'bg-green-600';
    }
  };

  return (
    <div className="bg-gray-900 text-white p-8 rounded-xl shadow-2xl">
      <h1 className="text-3xl font-bold mb-6">Project Management</h1>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <input
          type="text"
          value={newProject.name}
          onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
          className="p-2 bg-gray-800 rounded"
          placeholder="Project Name"
        />
        <input
          type="date"
          value={newProject.dueDate}
          onChange={(e) => setNewProject({ ...newProject, dueDate: e.target.value })}
          className="p-2 bg-gray-800 rounded"
        />
      </div>
      <textarea
        value={newProject.description}
        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
        className="p-2 bg-gray-800 rounded w-full mb-4"
        placeholder="Project Description"
      />
      <button
        onClick={addProject}
        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mb-4"
      >
        Add Project
      </button>
      <div className="mb-4">
        <label className="mr-2">Filter by Status:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'To Do' | 'In Progress' | 'Completed' | 'All')}
          className="p-2 bg-gray-800 rounded"
        >
          <option value="All">All</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
      <ul>
        {filteredProjects.map(project => (
          <li key={project.id} className="mb-4 bg-gray-800 p-4 rounded">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">{project.name}</h3>
              <span className={\`px-2 py-1 rounded \${getStatusColor(project.status)}\`}>
                {project.status}
              </span>
            </div>
            <p className="text-gray-400 mt-2">{project.description}</p>
            <p className="mt-2"><strong>Due Date:</strong> {project.dueDate}</p>
            <div className="mt-4">
              <select
                value={project.status}
                onChange={(e) => updateProjectStatus(project.id, e.target.value as 'To Do' | 'In Progress' | 'Completed')}
                className="p-2 bg-gray-700 rounded mr-2"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <button
                onClick={() => deleteProject(project.id)}
                className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

render(<ProjectManagement />);
`

export const PROJECT_MANAGEMENT_CSS = `
/* No additional CSS needed as styles are handled by Tailwind */
`
