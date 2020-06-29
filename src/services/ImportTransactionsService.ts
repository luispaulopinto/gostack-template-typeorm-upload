import { getRepository, In, getCustomRepository } from 'typeorm';
import csvParse from 'csv-parse';
import path from 'path';
import fs from 'fs';

import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: string;
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(transactionsFileName: string): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transactionsFilePath = path.join(
      uploadConfig.directory,
      transactionsFileName,
    );

    const readCSVStream = fs.createReadStream(transactionsFilePath);

    const parseStream = csvParse({
      from_line: 2,
      // ltrim: true,
      // rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      // console.log('line', line);
      const [title, type, value, category] = line
        // line[0]
        // .split(';')
        .map((cell: string) => cell.trim());

      if (!title || !type || !value) return;

      console.log('transactions insert');
      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    console.log('transactions array', transactions);

    const existentCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(
        transaction =>
          ({
            title: transaction.title,
            type: transaction.type,
            value: transaction.value,
            category: finalCategories.find(
              category => category.title === transaction.category,
            ),
          } as Transaction),
      ),
    );

    await transactionsRepository.save(createdTransactions);
    // stat = retorna status de um arquivo se existir
    // const transactionFileExists = await fs.promises.stat(transactionsFilePath);
    // if (transactionFileExists) await fs.promises.unlink(transactionsFilePath);

    return createdTransactions;
  }
}

// async function loadCSV(transactionsFilePath: string): Promise<string[]> {
//   const readCSVStream = fs.createReadStream(transactionsFilePath);

//   const parseStream = csvParse({
//     from_line: 2,
//     ltrim: true,
//     rtrim: true,
//   });

//   const parseCSV = readCSVStream.pipe(parseStream);

//   const lines: string[] = [];

//   parseCSV.on('data', line => {
//     lines.push(line);
//   });

//   await new Promise(resolve => {
//     parseCSV.on('end', resolve);
//   });

//   return lines;
// }

// function getImportedTransactions(data: string[]): Promise<Transaction[]> {
//   const createTransactionService = new CreateTransactionService();

//   return Promise.all(
//     data.map(async trans => {
//       const transValues = trans[0].split(';');

//       const transaction = await createTransactionService.execute({
//         title: transValues[0],
//         type: transValues[1] as 'income' | 'outcome',
//         value: Number(transValues[2]),
//         categoryName: transValues[3],
//       });

//       return transaction;
//     }),
//   );
// }

// class ImportTransactionsService {
//   async execute({ transactionsFileName }: Request): Promise<Transaction[]> {
//     const transactionsFilePath = path.join(
//       uploadConfig.directory,
//       transactionsFileName,
//     );

//     const data = await loadCSV(transactionsFilePath);

//     const transactions = getImportedTransactions(data);

//     // stat = retorna status de um arquivo se existir
//     // const transactionFileExists = await fs.promises.stat(transactionsFilePath);
//     // if (transactionFileExists) await fs.promises.unlink(transactionsFilePath);

//     return transactions;
//   }
// }

export default ImportTransactionsService;
