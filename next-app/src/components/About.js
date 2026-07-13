import styles from './About.module.css';

const techStack = [
  'Next.js',
  'React',
  'Node.js',
  'Express',
  'MongoDB',
  'PostgreSQL',
  'TypeScript',
  'Docker',
  'AWS',
  'Git',
];

export default function About() {
  return (
    <section id="about" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h2 className={styles.title}>About Me</h2>
          <p className={styles.description}>
            I&apos;m a Full Stack Developer passionate about building modern,
            performant web applications. With expertise spanning frontend
            frameworks, backend architectures, and cloud infrastructure, I
            transform ideas into polished, production-ready products.
          </p>
          <p className={styles.description}>
            I believe great software comes from clean code, thoughtful design,
            and relentless attention to detail. Whether it&apos;s a startup MVP
            or an enterprise platform, I bring the same dedication to every
            project.
          </p>
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
