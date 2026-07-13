import styles from './About.module.css';

export default function About({ data }) {
  const title = data?.title || 'About JS Compiler';
  const paragraphs = data?.paragraphs || [
    'JS Compiler is a desktop app for writing, running, and saving JavaScript snippets.',
  ];
  const techStack = data?.techStack || [
    'Electron',
    'JavaScript',
    'Node.js',
    'Express',
    'Next.js',
    'React',
  ];

  return (
    <section id="about" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h2 className={styles.title}>{title}</h2>
          {paragraphs.map((p, i) => (
            <p key={i} className={styles.description}>
              {p}
            </p>
          ))}
        </div>

        <div className={styles.stackSide}>
          <h3 className={styles.stackTitle}>Tech Stack</h3>
          <div className={styles.pills}>
            {techStack.map((tech) => (
              <span key={tech} className={styles.pill}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
