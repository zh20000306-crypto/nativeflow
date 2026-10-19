import React, { useState } from 'react';
import {
  Search,
  Filter,
  Star,
  Volume2,
  Clock,
  PenTool,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  BookOpen,
  Plus,
  ArrowUpDown,
  ExternalLink,
  FileText,
  Table,
  ChevronDown,
} from 'lucide-react';
import { ExpressionCard } from '../types/card';
import { speakEnglish } from '../utils/audio';
import { isDue } from '../utils/srs';

interface CardsLibraryProps {
  cards: ExpressionCard[];
  onSelectCard: (card: ExpressionCard) => void;
  onOpenSentenceModal: (card: ExpressionCard) => void;
  onToggleStar: (id: string) => void;
  onDeleteCard: (id: string) => void;
  onImportCards: (cards: ExpressionCard[]) => void;
  onNavigateToAdd: () => void;
}

export const CardsLibrary: React.FC<CardsLibraryProps> = ({
  cards,
  onSelectCard,
  onOpenSentenceModal,
  onToggleStar,
  onDeleteCard,
  onImportCards,
  onNavigateToAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<
    'all' | 'due' | 'learning' | 'mastered' | 'starred'
  >('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Collect unique tags
  const allTags = Array.from(new Set(cards.flatMap((c) => c.tags || [])));

  // Filtered cards
  const filteredCards = cards.filter((card) => {
    // Search match
    const matchesSearch =
      card.expression.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.chineseMeaning.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Tag filter
    if (tagFilter && (!card.tags || !card.tags.includes(tagFilter))) {
      return false;
    }

    // Status filter
    if (filterMode === 'due') {
      return isDue(card.nextReviewDate);
    }
    if (filterMode === 'learning') {
      return card.masteryStage === 'learning' || card.masteryStage === 'new';
    }
    if (filterMode === 'mastered') {
      return card.masteryStage === 'mastered';
    }
    if (filterMode === 'starred') {
      return card.starred;
    }

    return true;
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleDeleteWithConfirm = (e: React.MouseEvent, card: ExpressionCard) => {
    e.stopPropagation();
    if (confirmDeleteId === card.id) {
      onDeleteCard(card.id);
      setConfirmDeleteId(null);
      showToast(`已从词库中移除 "${card.expression}"`);
    } else {
      setConfirmDeleteId(card.id);
      setTimeout(() => {
        setConfirmDeleteId((prev) => (prev === card.id ? null : prev));
      }, 4000);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(cards, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nativeflow-cards-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowExportMenu(false);
    showToast('词库与造句数据已成功导出为本地 JSON 备份文件！');
  };

  const handleExportAnki = () => {
    const rows = cards.map((c) => {
      const front = `${c.expression}<br><small style="color:#666">${c.phoneticUs || ''}</small>`;
      const collocationsHtml = (c.collocations || [])
        .map((col) => `• <b>${col.phrase}</b>: ${col.translation}`)
        .join('<br>');
      const examplesHtml = (c.examples || [])
        .map((ex) => `<i>"${ex.en}"</i><br>${ex.zh}`)
        .join('<br><br>');
      const sentencesHtml = (c.userSentences || [])
        .slice(0, 2)
        .map(
          (s) =>
            `✍️ <b>造句</b>: "${s.sentence}" (${s.score}分)<br>💎 <b>润色</b>: "${s.nativeAlternative || ''}"`
        )
        .join('<br><br>');

      const englishDefHtml = c.englishDefinition
        ? `<div style="color:#555;font-style:italic;margin-bottom:6px;">"${c.englishDefinition}"</div>`
        : '';
      const back = `<b>[${c.register || '日常'} · ${c.chineseMeaning}]</b><br>${englishDefHtml}${c.nuance || ''}<br><hr>${collocationsHtml ? `<b>常见搭配：</b><br>${collocationsHtml}<br><hr>` : ''}${examplesHtml ? `<b>语境例句：</b><br>${examplesHtml}<br><hr>` : ''}${sentencesHtml ? `<b>实战造句：</b><br>${sentencesHtml}` : ''}`;

      const cleanFront = front.replace(/\t/g, ' ').replace(/\n/g, ' ');
      const cleanBack = back.replace(/\t/g, ' ').replace(/\n/g, ' ');
      return `${cleanFront}\t${cleanBack}\t${(c.tags || []).join(' ')}`;
    });

    const fileContent = `#separator:tab\n#html:true\n#tags column:3\n${rows.join('\n')}`;
    const blob = new Blob([fileContent], {
      type: 'text/tab-separated-values;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nativeflow-anki-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    showToast('已生成 Anki 专用词包文件 (.txt)，支持在 Anki 中直接一键导入！');
  };

  const handleExportCSV = () => {
    const headers = [
      'Expression',
      'Phonetic',
      'ChineseMeaning',
      'EnglishDefinition',
      'Register',
      'Nuance',
      'Collocations',
      'Examples',
      'UserSentencesCount',
      'MasteryStage',
      'NextReviewDate',
    ];
    const rows = cards.map((c) => [
      `"${c.expression.replace(/"/g, '""')}"`,
      `"${(c.phoneticUs || '').replace(/"/g, '""')}"`,
      `"${(c.chineseMeaning || '').replace(/"/g, '""')}"`,
      `"${(c.englishDefinition || '').replace(/"/g, '""')}"`,
      `"${(c.register || '').replace(/"/g, '""')}"`,
      `"${(c.nuance || '').replace(/"/g, '""')}"`,
      `"${(c.collocations || [])
        .map((col) => `${col.phrase} (${col.translation})`)
        .join('; ')
        .replace(/"/g, '""')}"`,
      `"${(c.examples || [])
        .map((ex) => `${ex.en} (${ex.zh})`)
        .join('; ')
        .replace(/"/g, '""')}"`,
      (c.userSentences || []).length,
      c.masteryStage,
      c.nextReviewDate,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nativeflow-cards-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    showToast('已导出 Excel/CSV 表格，可使用 Excel、WPS 或飞书表格直接打开！');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportCards(parsed);
          showToast(`成功恢复并导入 ${parsed.length} 张表达卡片及造句记录！`);
        } else {
          showToast('文件格式有误，请确保是有效的 JSON 卡片数组备份文件');
        }
      } catch (err) {
        showToast('解析失败，请检查文件是否为有效的 JSON 格式');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 font-serif">
            我的地道表达卡片库
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            已收录 {cards.length} 条表达 · 累计造句{' '}
            {cards.reduce((acc, c) => acc + (c.userSentences?.length || 0), 0)} 次
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
              title="多格式导出卡片"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出词库</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 py-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={handleExportAnki}
                  className="w-full text-left px-3.5 py-2 text-xs text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 flex items-start space-x-2.5 transition-colors"
                >
                  <FileText className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">Anki 词包格式 (.txt)</div>
                    <div className="text-[10px] text-stone-400">制表符分隔 · 完美导入Anki</div>
                  </div>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-3.5 py-2 text-xs text-stone-700 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-start space-x-2.5 transition-colors"
                >
                  <Table className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">Excel 表格 (.csv)</div>
                    <div className="text-[10px] text-stone-400">带BOM · Excel/飞书秒开</div>
                  </div>
                </button>

                <button
                  onClick={handleExportJSON}
                  className="w-full text-left px-3.5 py-2 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-start space-x-2.5 border-t border-stone-100 dark:border-stone-700/60 transition-colors"
                >
                  <Download className="w-4 h-4 text-stone-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">完整数据备份 (.json)</div>
                    <div className="text-[10px] text-stone-400">全量卡片与复习算法状态</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <label className="px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>导入数据</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          <button
            onClick={onNavigateToAdd}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>录入表达</span>
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{toastMsg}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-100 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索英文表达、搭配、或中文释义..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-stone-400 hover:text-stone-600 absolute right-3 top-3.5"
            >
              清空
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setFilterMode('all')}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            全部 ({cards.length})
          </button>

          <button
            onClick={() => setFilterMode('due')}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center space-x-1 ${
              filterMode === 'due'
                ? 'bg-amber-500 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>
              待复习 ({cards.filter((c) => isDue(c.nextReviewDate)).length})
            </span>
          </button>

          <button
            onClick={() => setFilterMode('learning')}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
              filterMode === 'learning'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            学习中 (
            {
              cards.filter(
                (c) => c.masteryStage === 'learning' || c.masteryStage === 'new'
              ).length
            }
            )
          </button>

          <button
            onClick={() => setFilterMode('mastered')}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
              filterMode === 'mastered'
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            已掌握 ({cards.filter((c) => c.masteryStage === 'mastered').length})
          </button>

          <button
            onClick={() => setFilterMode('starred')}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center space-x-1 ${
              filterMode === 'starred'
                ? 'bg-amber-500 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            <span>星标收藏 ({cards.filter((c) => c.starred).length})</span>
          </button>
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
            <span className="text-stone-400">标签分类：</span>
            {tagFilter && (
              <button
                onClick={() => setTagFilter(null)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200"
              >
                ✕ 重置标签
              </button>
            )}
            {allTags.map((tag, idx) => (
              <button
                key={idx}
                onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                  tagFilter === tag
                    ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold'
                    : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-amber-300'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-3xl p-8 space-y-3">
          <BookOpen className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
          <h3 className="text-base font-bold text-stone-700 dark:text-stone-300">
            没有找到匹配的表达卡片
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            尝试更换搜索词或重置筛选条件，也可以立刻录入一条新的英语表达！
          </p>
          <button
            onClick={onNavigateToAdd}
            className="mt-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-md shadow-amber-500/20"
          >
            录入新表达
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCards.map((card) => {
            const due = isDue(card.nextReviewDate);

            return (
              <div
                key={card.id}
                className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 shadow-md hover:shadow-lg transition-all space-y-3 relative group flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        {card.register || '日常'}
                      </span>
                      {due && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>待复习</span>
                        </span>
                      )}
                      {card.masteryStage === 'mastered' && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center space-x-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>已熟练掌握</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(card.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          card.starred
                            ? 'text-amber-500'
                            : 'text-stone-300 hover:text-stone-500'
                        }`}
                        title="收藏"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            card.starred ? 'fill-current' : ''
                          }`}
                        />
                      </button>

                      {confirmDeleteId === card.id ? (
                        <button
                          onClick={(e) => handleDeleteWithConfirm(e, card)}
                          className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold animate-pulse shadow-sm"
                          title="再次点击确认删除"
                        >
                          确认删除?
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleDeleteWithConfirm(e, card)}
                          className="p-1.5 rounded-lg text-stone-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="删除卡片"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expression and pronunciation */}
                  <div className="flex items-baseline space-x-2">
                    <h3
                      onClick={() => onSelectCard(card)}
                      className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-colors"
                    >
                      {card.expression}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakEnglish(card.expression);
                      }}
                      className="text-stone-400 hover:text-amber-600 p-1"
                      title="发音"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-stone-400 font-mono">
                      {card.phoneticUs}
                    </span>
                  </div>

                  {/* Meaning & English definition */}
                  <div className="mt-1 space-y-0.5">
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-200 line-clamp-1">
                      {card.chineseMeaning}
                    </p>
                    {card.englishDefinition && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-serif italic line-clamp-1">
                        "{card.englishDefinition}"
                      </p>
                    )}
                  </div>

                  {/* Sample example preview */}
                  {card.examples?.[0] && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 font-serif italic line-clamp-2 bg-stone-50/70 dark:bg-stone-800/40 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800">
                      "{card.examples[0].en}"
                    </p>
                  )}
                </div>

                {/* Footer stats & actions */}
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-stone-400">
                    <span>复习间隔: {card.intervalDays}天</span>
                    <span>•</span>
                    <span>
                      {card.userSentences?.length || 0} 篇实战造句
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onOpenSentenceModal(card)}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-medium flex items-center space-x-1"
                    >
                      <PenTool className="w-3 h-3" />
                      <span>造句</span>
                    </button>

                    <button
                      onClick={() => onSelectCard(card)}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 font-medium"
                    >
                      详情
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
