"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createCollection } from "@/shared/lib/collection";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { useToast } from "@/shared/ui/toast/toast-provider";
import { MAX_VOTES, VOTES_KEY, parseVotes, results, unanswered } from "../domain/survey";
import type { SurveyAnswers, SurveyVote } from "../domain/types";
import type { SurveyData } from "../load-surveys";
import styles from "./surveys.module.css";

const votes = createCollection<SurveyVote>({
  key: VOTES_KEY,
  parse: parseVotes,
  max: MAX_VOTES,
  idOf: (vote) => vote.surveyId,
});

type Labels = Dictionary["surveysPage"];
const tabs = ["about", "terms", "results"] as const;
type Tab = (typeof tabs)[number];

/**
 * The body of a survey page, after astana.kz: tabs about the survey on the left, the box "Take the
 * survey" on the right. Taking it replaces the tabs with the questions; after sending, the results.
 */
export function SurveyView({
  survey,
  lang,
  labels,
}: {
  survey: SurveyData;
  lang: Locale;
  labels: Labels;
}) {
  const toast = useToast();
  const id = useId();
  const mine = votes.useAll().find((vote) => vote.surveyId === survey.id);
  const [tab, setTab] = useState<Tab>("about");
  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [missing, setMissing] = useState<string[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const [moved, setMoved] = useState(0);

  const showResults = Boolean(mine) || !survey.open;
  const counted = results(survey, mine?.answers);

  useEffect(() => {
    if (moved === 0) return;
    if (taking) formRef.current?.querySelector<HTMLElement>("input")?.focus();
    else resultsRef.current?.focus();
  }, [moved, taking]);

  function onTabKey(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    setTab(tabs[next]);
    tabRefs.current[next]?.focus();
  }

  function choose(questionId: string, optionId: string, single: boolean, checked: boolean) {
    setAnswers((current) => {
      const before = current[questionId] ?? [];
      const after = single
        ? [optionId]
        : checked
          ? [...before, optionId]
          : before.filter((item) => item !== optionId);
      return { ...current, [questionId]: after };
    });
    setMissing((current) => current.filter((item) => item !== questionId));
  }

  function send(event: FormEvent) {
    event.preventDefault();
    const left = unanswered(survey, answers);
    setMissing(left);
    if (left.length > 0) {
      formRef.current?.querySelector<HTMLElement>(`[data-question="${left[0]}"] input`)?.focus();
      return;
    }
    votes.add({ surveyId: survey.id, answers, at: new Date().toISOString() });
    setTaking(false);
    setTab("results");
    setMoved((n) => n + 1);
    toast.show(labels.thanks);
  }

  const resultsBlock = (
    <div className={styles.results}>
      {survey.questions.map((question, index) => (
        <section key={question.id} className={styles.question}>
          <h3 className={styles.questionText}>{question.text}</h3>
          <p className={styles.note}>{format(labels.votes, { n: counted[index].total })}</p>
          <ul className={styles.bars}>
            {question.options.map((option, optionIndex) => {
              const result = counted[index].options[optionIndex];
              return (
                <li key={option.id} className={styles.bar} data-mine={result.mine}>
                  <span className={styles.barLabel}>
                    {option.text}
                    {result.mine && <span className={styles.mine}> · {labels.mine}</span>}
                  </span>
                  <span className={styles.barValue}>{result.percent}%</span>
                  <span className={styles.barTrack} aria-hidden="true">
                    <span className={styles.barFill} style={{ width: `${result.percent}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        {taking ? (
          <form ref={formRef} className={styles.form} noValidate onSubmit={send}>
            {/* The box beside already says "Take the survey"; the form keeps the heading for screen readers. */}
            <h2 className="visually-hidden">{labels.takeTitle}</h2>
            {survey.questions.map((question) => {
              const single = question.kind === "single";
              const errorId = `${id}-${question.id}-error`;
              const wrong = missing.includes(question.id);
              return (
                <fieldset
                  key={question.id}
                  className={styles.question}
                  data-question={question.id}
                  aria-describedby={wrong ? errorId : undefined}
                >
                  <legend className={styles.questionText}>{question.text}</legend>
                  <p className={styles.note}>{single ? labels.single : labels.multiple}</p>
                  {question.options.map((option) => (
                    <label key={option.id} className={styles.option}>
                      <input
                        type={single ? "radio" : "checkbox"}
                        name={`${id}-${question.id}`}
                        checked={(answers[question.id] ?? []).includes(option.id)}
                        aria-invalid={wrong}
                        onChange={(event) =>
                          choose(question.id, option.id, single, event.target.checked)
                        }
                      />
                      <span>{option.text}</span>
                    </label>
                  ))}
                  {wrong && (
                    <p id={errorId} className={styles.error} role="alert">
                      {labels.missing}
                    </p>
                  )}
                </fieldset>
              );
            })}
            <div className={styles.actions}>
              <Button type="submit">{labels.send}</Button>
              <Button variant="ghost" onClick={() => setTaking(false)}>
                {labels.cancel}
              </Button>
            </div>
          </form>
        ) : (
          <div className={styles.panel}>
            <div role="tablist" aria-label={labels.tabs.label} className={styles.tabs}>
              {tabs.map((name, index) => (
                <button
                  key={name}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`${id}-tab-${name}`}
                  aria-selected={tab === name}
                  aria-controls={`${id}-panel`}
                  tabIndex={tab === name ? 0 : -1}
                  className={styles.tab}
                  onClick={() => setTab(name)}
                  onKeyDown={(event) => onTabKey(event, index)}
                >
                  {labels.tabs[name]}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={`${id}-panel`}
              aria-labelledby={`${id}-tab-${tab}`}
              className={styles.tabPanel}
            >
              {tab === "about" && (
                <>
                  <dl className={styles.facts}>
                    <div>
                      <dt>{labels.type}</dt>
                      <dd>
                        <span className={styles.tag}>{labels.typeValue}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>{labels.category}</dt>
                      <dd>
                        <span className={styles.tag}>{labels.categories[survey.category]}</span>
                      </dd>
                    </div>
                  </dl>
                  {survey.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </>
              )}
              {tab === "terms" && (
                <ul className={styles.terms}>
                  {labels.terms.map((term) => (
                    <li key={term}>{term}</li>
                  ))}
                </ul>
              )}
              {tab === "results" && (
                <>
                  <h2 className={styles.panelTitle} tabIndex={-1} ref={resultsRef}>
                    {labels.impactTitle}
                  </h2>
                  <p>{survey.impact}</p>
                  {showResults ? (
                    resultsBlock
                  ) : (
                    <p className={styles.note}>{labels.resultsAfter}</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <aside className={styles.take} aria-labelledby={`${id}-take`}>
        <h2 id={`${id}-take`} className={styles.takeTitle}>
          {labels.takeTitle}
        </h2>
        <dl className={styles.takeFacts}>
          <div>
            <dt>{labels.until}</dt>
            <dd>{survey.open ? formatDate(survey.endsOn, lang) : labels.closed}</dd>
          </div>
          <div>
            <dt>{labels.time}</dt>
            <dd>{format(labels.minutes, { n: survey.minutes })}</dd>
          </div>
          <div>
            <dt>{labels.attempts}</dt>
            <dd>1</dd>
          </div>
          <div>
            <dt>{labels.participantsLabel}</dt>
            <dd>{survey.participants + (mine ? 1 : 0)}</dd>
          </div>
        </dl>
        {!survey.open ? (
          <p className={styles.takeNote}>{labels.closed}</p>
        ) : mine ? (
          <p className={styles.takeNote}>{labels.done}</p>
        ) : (
          !taking && (
            <Button
              variant="light"
              onClick={() => {
                setTaking(true);
                setMoved((n) => n + 1);
              }}
            >
              {labels.start}
            </Button>
          )
        )}
      </aside>
    </div>
  );
}
