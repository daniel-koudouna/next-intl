import React, {ReactNode, useEffect} from 'react';
import AbstractIntlMessages from './AbstractIntlMessages';
import Formats from './Formats';
import IntlContext from './IntlContext';
import IntlError, {IntlErrorCode} from './IntlError';
import {RichTranslationValues} from './TranslationValues';

type Props = {
  /** All messages that will be available in your components. */
  messages?: AbstractIntlMessages;
  /** A valid Unicode locale tag (e.g. "en" or "en-GB"). */
  locale: string;
  /** Global formats can be provided to achieve consistent
   * formatting across components. */
  formats?: Partial<Formats>;
  /** A time zone as defined in [the tz database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) which will be applied when formatting dates and times. If this is absent, the user time zone will be used. You can override this by supplying an explicit time zone to `formatDateTime`. */
  timeZone?: string;
  /** This callback will be invoked when an error is encountered during
   * resolving a message or formatting it. This defaults to `console.error` to
   * keep your app running. You can customize the handling by taking
   * `error.code` into account. */
  onError?(error: IntlError): void;
  /** Will be called when a message couldn't be resolved or formatting it led to
   * an error. This defaults to `${namespace}.${key}` You can use this to
   * customize what will be rendered in this case. */
  getMessageFallback?(info: {
    namespace?: string;
    key: string;
    error: IntlError;
  }): string;
  /** All components that use the provided hooks should be within this tree. */
  children: ReactNode;
  /**
   * Providing this value will have two effects:
   * 1. It will be used as the default for the `now` argument of
   *    `useIntl().formatRelativeTime` if no explicit value is provided.
   * 2. It will be returned as a static value from the `useNow` hook. Note
   *    however that when `updateInterval` is configured on the `useNow` hook,
   *    the global `now` value will only be used for the initial render, but
   *    afterwards the current date will be returned continuously.
   */
  now?: Date;
  /** Global default values for translation values and rich text elements.
   * Can be used for consistent usage or styling of rich text elements.
   * Defaults will be overidden by locally provided values. */
  defaultTranslationValues?: RichTranslationValues;
};

function defaultGetMessageFallback({
  key,
  namespace
}: {
  key: string;
  namespace?: string;
}) {
  return [namespace, key].filter((part) => part != null).join('.');
}

function defaultOnError(error: IntlError) {
  console.error(error);
}

export default function IntlProvider({
  children,
  onError = defaultOnError,
  getMessageFallback = defaultGetMessageFallback,
  messages,
  ...contextValues
}: Props) {
  // Validation of the namespace keys is currently inlined as the bundler that
  // Bundlephobia uses is apparently not smart enough to throw the import out if
  // this is imported from a separate module.
  if (__DEV__) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      function validateMessagesSegment(
        messagesPart: AbstractIntlMessages,
        invalidKeyLabels: Array<string>,
        parentPath?: string
      ) {
        Object.entries(messagesPart).forEach(([key, messageOrMessages]) => {
          if (key.includes('.')) {
            let keyLabel = key;
            if (parentPath) keyLabel += ` (at ${parentPath})`;
            invalidKeyLabels.push(keyLabel);
          }
          if (typeof messageOrMessages === 'object') {
            validateMessagesSegment(
              messageOrMessages,
              invalidKeyLabels,
              [parentPath, key].filter((part) => part != null).join('.')
            );
          }
        });
      }

      function validateMessages() {
        if (!messages) return;

        const invalidKeyLabels: Array<string> = [];
        validateMessagesSegment(messages, invalidKeyLabels);

        if (invalidKeyLabels.length > 0) {
          onError(
            new IntlError(
              IntlErrorCode.INVALID_KEY,
              `Namespace keys can not contain the character "." as this is used to express nesting. Please remove it or replace it with another character.\n\nInvalid ${
                invalidKeyLabels.length === 1 ? 'key' : 'keys'
              }: ${invalidKeyLabels.join(', ')}`
            )
          );
        }
      }

      validateMessages();
    }, [messages, onError]);
  }

  return (
    <IntlContext.Provider
      value={{...contextValues, messages, onError, getMessageFallback}}
    >
      {children}
    </IntlContext.Provider>
  );
}
