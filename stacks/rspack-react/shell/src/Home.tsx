import { Link } from 'react-router';
import { formatPrice, HOME_CARDS, HOME_INTRO } from '@mf-eval/contracts/fixtures';
import styles from './shell.module.css';

/**
 * THE CONTROL. Rendered by the shell itself, no federation involved.
 *
 * The difference between this page and a federated one, with content held equivalent,
 * is the only honest measurement of what federation itself costs
 * (docs/decision-log.md D8).
 */
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
      <p><Link to="/product">Browse products</Link></p>
    </>
  );
}
