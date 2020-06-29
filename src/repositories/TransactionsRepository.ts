import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const incomeReducer = (a: number, c: Transaction): number => {
      return c.type === 'income' ? a + Number(c.value) : a + 0;
    };

    const outcomeReducer = (a: number, c: Transaction): number => {
      return c.type === 'outcome' ? a + Number(c.value) : a + 0;
    };

    const income = transactions.reduce(incomeReducer, 0);
    const outcome = transactions.reduce(outcomeReducer, 0);

    return {
      income,
      outcome,
      total: income - outcome,
    };
  }
}

export default TransactionsRepository;
