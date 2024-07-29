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

export const BUTTON_COMPONENTS = `
import React from "react";
import render from "react-dom";

function PrimaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
    >
      {children}
    </button>
  );
}

function OutlineButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="border border-blue-500 hover:bg-blue-500 hover:text-white text-blue-500 font-bold py-2 px-4 rounded dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

function RoundedButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full dark:bg-green-600 dark:hover:bg-green-700 dark:text-white"
    >
      {children}
    </button>
  );
}

function IconButton({ icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-red-500 hover:bg-red-600 text-white font-bold p-2 rounded-full dark:bg-red-600 dark:hover:bg-red-700 dark:text-white"
    >
      {icon}
    </button>
  );
}

function ButtonShowcase() {
  return (
    <div className="space-y-4 dark:bg-gray-900 p-4">
      <PrimaryButton onClick={() => alert('Primary clicked')}>Primary Button</PrimaryButton>
      <SecondaryButton onClick={() => alert('Secondary clicked')}>Secondary Button</SecondaryButton>
      <OutlineButton onClick={() => alert('Outline clicked')}>Outline Button</OutlineButton>
      <RoundedButton onClick={() => alert('Rounded clicked')}>Rounded Button</RoundedButton>
      <IconButton icon="★" onClick={() => alert('Icon clicked')} />
    </div>
  );
}

render(<ButtonShowcase />);
`

export const INPUT_COMPONENTS = `
import React from "react";
import render from "react-dom";

function TextInput({ placeholder, value, onChange }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
    />
  );
}

function PasswordInput({ placeholder, value, onChange }) {
  return (
    <input
      type="password"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
    />
  );
}

function TextArea({ placeholder, value, onChange }) {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full h-24 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
    />
  );
}

function SearchInput({ placeholder, value, onChange, onSearch }) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
      />
      <button
        onClick={onSearch}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 dark:text-gray-400"
      >
        🔍
      </button>
    </div>
  );
}

function NumberInput({ placeholder, value, onChange, min, max }) {
  return (
    <input
      type="number"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
    />
  );
}

function InputShowcase() {
  const [text, setText] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [textArea, setTextArea] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [number, setNumber] = React.useState('');

  return (
    <div className="space-y-4 dark:bg-gray-900 p-4">
      <TextInput placeholder="Enter text" value={text} onChange={(e) => setText(e.target.value)} />
      <PasswordInput placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <TextArea placeholder="Enter long text" value={textArea} onChange={(e) => setTextArea(e.target.value)} />
      <SearchInput placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} onSearch={() => alert('Search: ' + search)} />
      <NumberInput placeholder="Enter number" value={number} onChange={(e) => setNumber(e.target.value)} min={0} max={100} />
    </div>
  );
}

render(<InputShowcase />);
`

export const CARD_COMPONENTS = `
import React from "react";
import render from "react-dom";

function SimpleCard({ title, content }) {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden dark:bg-gray-800">
      <div className="px-6 py-4">
        <div className="font-bold text-xl mb-2 dark:text-white">{title}</div>
        <p className="text-gray-700 text-base dark:text-gray-300">{content}</p>
      </div>
    </div>
  );
}

function ImageCard({ title, content, imageUrl }) {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden dark:bg-gray-800">
      <img className="w-full h-48 object-cover" src={imageUrl} alt={title} />
      <div className="px-6 py-4">
        <div className="font-bold text-xl mb-2 dark:text-white">{title}</div>
        <p className="text-gray-700 text-base dark:text-gray-300">{content}</p>
      </div>
    </div>
  );
}

function ActionCard({ title, content, actionText, onAction }) {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden dark:bg-gray-800">
      <div className="px-6 py-4">
        <div className="font-bold text-xl mb-2 dark:text-white">{title}</div>
        <p className="text-gray-700 text-base mb-4 dark:text-gray-300">{content}</p>
        <button
          onClick={onAction}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          {actionText}
        </button>
      </div>
    </div>
  );
}

function HoverCard({ title, content }) {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden transition-transform duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg dark:bg-gray-800">
      <div className="px-6 py-4">
        <div className="font-bold text-xl mb-2 dark:text-white">{title}</div>
        <p className="text-gray-700 text-base dark:text-gray-300">{content}</p>
      </div>
    </div>
  );
}

function CardWithFooter({ title, content, footerText }) {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col dark:bg-gray-800">
      <div className="px-6 py-4 flex-grow">
        <div className="font-bold text-xl mb-2 dark:text-white">{title}</div>
        <p className="text-gray-700 text-base dark:text-gray-300">{content}</p>
      </div>
      <div className="px-6 py-4 bg-gray-100 dark:bg-gray-700">
        <p className="text-gray-600 text-sm dark:text-gray-400">{footerText}</p>
      </div>
    </div>
  );
}

function CardShowcase() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 dark:bg-gray-900 p-4">
      <SimpleCard title="Simple Card" content="This is a basic card component." />
      <ImageCard
        title="Image Card"
        content="This card includes an image."
        imageUrl="https://via.placeholder.com/300x200"
      />
      <ActionCard
        title="Action Card"
        content="This card has an action button."
        actionText="Click me"
        onAction={() => alert('Action clicked')}
      />
      <HoverCard title="Hover Card" content="This card has a hover effect." />
      <CardWithFooter
        title="Card with Footer"
        content="This card includes a footer section."
        footerText="Footer information"
      />
    </div>
  );
}

render(<CardShowcase />);
`

export const COMPONENTS_CSS = `
/* No additional CSS needed as styles are handled by Tailwind */
`
