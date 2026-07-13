import styles from './Features.module.css';

const features = [
  {
    icon: '🚀',
    title: 'Frontend Development',
    description:
      'Building responsive, performant UIs with React & Next.js',
  },
  {
    icon: '⚡',
    title: 'Backend Systems',
    description:
      'Scalable Node.js APIs with Express, MongoDB & PostgreSQL',
  },
  {
    icon: '🎨',
    title: 'UI/UX Design',
    description:
      'Clean, modern interfaces that users love to interact with',
  },
  {
    icon: '📱',
    title: 'Mobile Responsive',
    description:
      'Pixel-perfect designs that work beautifully on every device',
  },
  {
    icon: '🔒',
    title: 'Security First',
    description:
      'Implementing best practices for secure, production-ready apps',
  },
  {
    icon: '🛠️',
    title: 'DevOps & Deploy',
    description:
      'CI/CD pipelines, Docker, and cloud deployment on Vercel & AWS',
  },
];

export default function Features() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>What I Do</h2>
          <p className={styles.subtitle}>
            Specialized skills to bring your ideas to life
          </p>
        </div>

        <div className={styles.grid}>
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={styles.card}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <span className={styles.icon}>{feature.icon}</span>
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.cardDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
