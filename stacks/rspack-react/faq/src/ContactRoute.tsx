import styles from './contact.module.css';

export function Component() {
  return (
    <div className={styles.panel}>
      <h1 className={styles.heading} data-testid="faq-contact">Contact the FAQ team</h1>
    </div>
  );
}
