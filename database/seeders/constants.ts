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

export const ENABLED_LANGUAGES: string[] = ['html', 'markdown', 'javascript', 'typescript']

export const SELF_CLOSING_TAGS: string[] = [
  'area',
  'base',
  'br',
  'col',
  'command',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
  'circle',
  'ellipse',
  'line',
  'path',
  'polygon',
  'polyline',
  'rect',
  'stop',
  'use',
]

export const DEFAULT_CSS_MONACO = `
.custom-class {
  color: red;
}
`

export const TYPESCRIPT_VARIANT_1 = `
import * as React from 'react';
import { render } from 'react-dom';
import './index.css';

type Props = {
  name: string;
};

const Greeting = (props: Props) => {
  const [greeting, setGreeting] = React.useState<string>('');

  React.useEffect(() => {
    setGreeting(\`Hello, \${props.name}!\`);
  }, [props.name]);

  return (
    <div className="flex flex-col items-center space-y-4 p-4 bg-gray-100 rounded shadow">
      <h1 className="text-white font-bold text-xl bg-darkslateblue p-2 rounded">
        {greeting}
      </h1>
    </div>
  );
};

render(<Greeting name="World" />);
`

export const TYPESCRIPT_VARIANT_2 = `
import * as React from 'react';
import { render } from 'react-dom';
import './index.css';

type Props = {
  items: string[];
};

const ItemList = (props: Props) => {
  const [items, setItems] = React.useState<string[]>(props.items);

  React.useEffect(() => {
    setItems(props.items);
  }, [props.items]);

  return (
    <div className="flex flex-col items-center space-y-4 p-4 bg-gray-100 rounded shadow">
      <ul className="list-disc">
        {items.map((item, index) => (
          <li key={index} className="text-white font-bold text-xl bg-darkslateblue p-2 rounded m-1">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

render(<ItemList items={['Apple', 'Banana', 'Cherry']} />);
`

export const TYPESCRIPT_VARIANT_3 = `
import * as React from 'react';
import { render } from 'react-dom';
import './index.css';

type Props = {
  initialCount: number;
};

const Counter = (props: Props) => {
  const [count, setCount] = React.useState<number>(props.initialCount);

  React.useEffect(() => {
    setCount(props.initialCount);
  }, [props.initialCount]);

  return (
    <div className="flex flex-col items-center space-y-4 p-4 bg-gray-100 rounded shadow">
      <p className="text-white font-bold text-xl bg-darkslateblue p-2 rounded">
        Count: {count}
      </p>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
        Increment
      </button>
    </div>
  );
};

render(<Counter initialCount={0} />);
`

export const TYPESCRIPT_VARIANT_4 = `
import * as React from 'react';
import { render } from 'react-dom';
import './index.css';

type Props = {
  text: string;
};

const ToggleText = (props: Props) => {
  const [visible, setVisible] = React.useState<boolean>(true);

  return (
    <div className="flex flex-col items-center space-y-4 p-4 bg-gray-100 rounded shadow">
      <button
        onClick={() => setVisible(!visible)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
        Toggle Text
      </button>
      {visible && (
        <p className="text-white font-bold text-xl bg-darkslateblue p-2 rounded">
          {props.text}
        </p>
      )}
    </div>
  );
};

render(<ToggleText text="Hello, toggle me!" />);
`

export const TYPESCRIPT_VARIANT_5 = `
import * as React from 'react';
import { render } from 'react-dom';
import './index.css';

type Props = {
  message: string;
};

const AlertButton = (props: Props) => {
  const showAlert = React.useRef(() => {
    alert(props.message);
  });

  return (
    <div className="flex flex-col items-center space-y-4 p-4 bg-gray-100 rounded shadow">
      <button
        onClick={() => showAlert.current()}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
        Show Alert
      </button>
    </div>
  );
};

render(<AlertButton message="This is an alert message!" />);
`
