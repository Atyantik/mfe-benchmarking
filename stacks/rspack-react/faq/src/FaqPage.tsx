import { FAQ } from '@mf-eval/contracts/fixtures';
import styles from './faq.module.css';

/** spec/reference-app.md § /faq — h1 + exactly FAQ_COUNT sections of h2 + p. */
export function FaqContent() {
  return (
    <>
      <h1>Frequently Asked Questions</h1>
      {FAQ.map((entry) => (
        <section key={entry.id} className={styles.entry} data-faq-id={entry.id}>
          <h2 className={styles.question}>{entry.question}</h2>
          <p className={styles.answer}>{entry.answer}</p>
        </section>
      ))}
    </>
  );
}
