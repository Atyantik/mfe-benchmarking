import { formatPrice, HOME_CARDS, HOME_INTRO } from '@mf-eval/contracts/fixtures';
import styles from './shell.module.css';

/** THE CONTROL — shell-native, no federation. Identical DOM to the SPA shell's Home. */
export function Component() {
  return (
    <>
      <h1>Reference Store</h1>
      <p>{HOME_INTRO}</p>
      <div className={styles.grid}>
        {HOME_CARDS.map((card) => (
          <article className={styles.card} key={card.id} data-card-id={card.id}>
            <h2>{card.title}</h2>
            <p>{card.blurb}</p>
            <span>{formatPrice(card.price)}</span>
          </article>
        ))}
      </div>
      <p><a href="/product">Browse products</a></p>
    </>
  );
}
