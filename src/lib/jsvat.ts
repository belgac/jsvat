export interface Multipliers {
  readonly [key: string]: ReadonlyArray<number>;
}

export interface Rules {
  multipliers: Multipliers;
  check?: RegExp;
  regex: ReadonlyArray<RegExp>;
  lookup?: ReadonlyArray<number>;
  typeFormats?: { readonly [key: string]: RegExp };
  additional?: ReadonlyArray<RegExp>;
}

export interface Country {
  name: string;
  codes: ReadonlyArray<string>;
  calcFn: (vat: string, options?: { readonly [key: string]: any }) => boolean;
  rules: Rules;
}

export interface CountryWithFormatValid extends Country {
  formatValid: boolean;
}

export interface VatCheckResult {
  value?: string;
  isValid: boolean;
  country?: {
    name: string,
    isoCode: { short: string, long: string, numeric: string }
    formatValid: boolean
  };
}

function makeResult(vat: string, isValid?: boolean, country?: CountryWithFormatValid): VatCheckResult {
  return {
    value: vat || undefined,
    isValid: Boolean(isValid),
    country: (!country) ? undefined : {
      name: country.name,
      isoCode: {
        short: country.codes[0],
        long: country.codes[1],
        numeric: country.codes[2]
      },
      formatValid: country.formatValid,
    }
  };
}

function removeExtraChars(vat: string = ''): string {
  return vat.toString().toUpperCase().replace(/(\s|-|\.)+/g, '');
}

function getCountryCode(country: Country): string {
  if (country.name === 'Greece') {
    return 'EL';
  } else {
    return country.codes[0];
  }
}

function getCountry(vat: string, countriesList: ReadonlyArray<Country>): CountryWithFormatValid | undefined {
  for (const country of countriesList) {
    const countryCode = getCountryCode(country);
    if (vat.startsWith(countryCode)) {
      const formatValid = isVatValidToRegexp(vat, country.rules.regex);
      return {
        ...country,
        formatValid: formatValid.isValid
      };
    }
  }
  return undefined;
}

function isVatValidToRegexp(vat: string, regexArr: ReadonlyArray<RegExp>): { isValid: boolean, regex?: RegExp } {
  for (const regex of regexArr) {
    const isValid = regex.test(vat);
    if (isValid) return { isValid: true, regex: regex };
  }

  return { isValid: false, regex: undefined };
}

function isVatValid(vat: string, country: Country): boolean {
  const regexpValidRes = isVatValidToRegexp(vat, country.rules.regex);
  if (!regexpValidRes.isValid || !regexpValidRes.regex) return false;
  const regexResult = regexpValidRes.regex.exec(vat);
  if (!regexResult) return false;
  return country.calcFn(regexResult[2]);
}

export function checkVAT(vat: string, countriesList: ReadonlyArray<Country> = []): VatCheckResult {
  if (!vat) return makeResult(vat, false);
  const cleanVAT = removeExtraChars(vat);
  const result = makeResult(cleanVAT);

  const country = getCountry(cleanVAT, countriesList);
  if (!country) return result;
  if (!country.formatValid) return makeResult(cleanVAT, country.formatValid, country)

  const isValid = isVatValid(cleanVAT, country);

  if (isValid) return makeResult(cleanVAT, isValid, country);

  return result;
}
