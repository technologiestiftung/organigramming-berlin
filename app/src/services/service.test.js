import { validateData } from './service';
import emptyDocument from '../data/emptyDocument.json';

test('validateData allows empty document logo', () => {
  const testDoc = {
    ...emptyDocument,
    document: {
      ...emptyDocument.document,
      logo: ""
    }
  };
  const [valid, errors] = validateData(testDoc);
  expect(valid).toBe(true);
  expect(errors).toBeNull();
});
