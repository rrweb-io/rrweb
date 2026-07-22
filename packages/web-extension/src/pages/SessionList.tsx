import { useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import {
  Box,
  Button,
  chakra,
  Checkbox,
  Divider,
  Editable,
  EditableInput,
  EditablePreview,
  Flex,
  IconButton,
  Input,
  Select,
  Spacer,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useEditableControls,
  useToast,
} from '@chakra-ui/react';
import {
  createColumnHelper,
  useReactTable,
  flexRender,
  getCoreRowModel,
  type SortingState,
  type RowSelectionState,
  getSortedRowModel,
  type PaginationState,
} from '@tanstack/react-table';
import { VscTriangleDown, VscTriangleUp } from 'react-icons/vsc';
import { FiEdit3 as EditIcon } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Browser from 'webextension-polyfill';
import type { eventWithTime } from 'rrweb';
import { type CloudSettings, type Session, EventName } from '~/types';
import Channel from '~/utils/channel';
import { loadCloudSettings } from '~/utils/cloud-settings';
import { type SessionUploadResult, uploadSessions } from '~/utils/cloud-upload';
import {
  deleteSessions,
  getAllSessions,
  downloadSessions,
  addSession,
  updateSession,
} from '~/utils/storage';
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
} from 'react-icons/fi';

const columnHelper = createColumnHelper<Session>();
const channel = new Channel();

export function SessionList() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'createTimestamp',
      desc: true,
    },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isUploading, setIsUploading] = useState(false);

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const fetchDataOptions = {
    pageIndex,
    pageSize,
  };

  const fetchData = (options: { pageIndex: number; pageSize: number }) => {
    return {
      rows: sessions.slice(
        options.pageIndex * options.pageSize,
        (options.pageIndex + 1) * options.pageSize,
      ),
      pageCount: Math.ceil(sessions.length / options.pageSize),
    };
  };
  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize],
  );
  const selectedSessionIds = useMemo(
    () =>
      sessions
        .filter((session) => rowSelection[session.id])
        .map((session) => session.id),
    [rowSelection, sessions],
  );

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all sessions on this page"
            isChecked={table.getIsAllRowsSelected()}
            isIndeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select ${row.original.name}`}
            isChecked={row.getIsSelected()}
            isIndeterminate={row.getIsSomeSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      }),
      columnHelper.accessor((row) => row.name, {
        cell: (info) => {
          const [isHovered, setIsHovered] = useState(false);
          function EditableControls() {
            const { isEditing, getEditButtonProps } = useEditableControls();
            return (
              isHovered &&
              !isEditing && (
                <Box
                  position="absolute"
                  top="0"
                  right="0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    aria-label="edit name"
                    size="sm"
                    icon={<EditIcon />}
                    variant="ghost"
                    {...getEditButtonProps()}
                  />
                </Box>
              )
            );
          }

          return (
            <Flex
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              alignItems="center"
              position="relative"
            >
              <Editable
                defaultValue={info.getValue()}
                isPreviewFocusable={false}
                onSubmit={(nextValue) => {
                  const newSession = { ...info.row.original, name: nextValue };
                  setSessions(
                    sessions.map((s) =>
                      s.id === newSession.id ? newSession : s,
                    ),
                  );
                  void updateSession(newSession);
                }}
              >
                <EditablePreview cursor="pointer" />
                <EditableControls />
                <EditableInput onClick={(e) => e.stopPropagation()} />
              </Editable>
            </Flex>
          );
        },
        header: 'Name',
      }),
      columnHelper.accessor((row) => row.createTimestamp, {
        id: 'createTimestamp',
        cell: (info) => new Date(info.getValue()).toLocaleString(),
        header: 'Created Time',
        sortDescFirst: true,
      }),
      columnHelper.accessor((row) => row.recorderVersion, {
        cell: (info) => info.getValue(),
        header: 'RRWEB Version',
      }),
    ],
    [sessions],
  );
  const table = useReactTable<Session>({
    columns,
    data: fetchData(fetchDataOptions).rows,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      pagination,
      sorting,
      rowSelection,
    },
    getRowId: (row) => row.id,
    manualPagination: true,
    pageCount: fetchData(fetchDataOptions).pageCount,
  });

  const updateSessions = async () => {
    const sessions = await getAllSessions();
    setSessions(sessions);
  };

  useEffect(() => {
    void updateSessions();
    channel.on(EventName.SessionUpdated, () => {
      void updateSessions();
    });
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as {
          session: Session;
          events: eventWithTime[];
        };
        const id = nanoid();
        data.session.id = id;
        await addSession(data.session, data.events);
        toast({
          title: 'Session imported',
          description: 'The session was successfully imported.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        await updateSessions();
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Error importing session',
          description: (error as Error).message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async (ids: string[]) => {
    if (ids.length === 0) return;

    setIsUploading(true);
    try {
      let settings: CloudSettings;

      try {
        settings = await loadCloudSettings(Browser.storage.local);
      } catch (error) {
        toast({
          title: 'Could not load cloud upload settings.',
          description:
            error instanceof Error && error.message
              ? error.message
              : 'Please try again.',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
        return;
      }

      let results: SessionUploadResult[];

      try {
        results = await uploadSessions(ids, settings);
      } catch (error) {
        toast({
          title: 'Could not complete the upload.',
          description:
            error instanceof Error && error.message
              ? error.message
              : 'Please try again.',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
        return;
      }

      const failures = results.filter((result) => !result.ok);
      const successes = results.length - failures.length;
      const failureDescription = failures
        .map((result) => `${result.name}: ${result.error ?? 'Upload failed'}`)
        .join('\n');

      if (failures.length === 0) {
        toast({
          title: 'Upload complete',
          description: `Uploaded ${successes} selected session${
            successes === 1 ? '' : 's'
          }.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else if (successes > 0) {
        toast({
          title: 'Upload completed with errors',
          description: `Uploaded ${successes} of ${results.length} selected sessions.\n${failureDescription}`,
          status: 'warning',
          duration: 8000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Upload failed',
          description: `No selected sessions were uploaded.\n${failureDescription}`,
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Flex justify="flex-end" mb={4}>
        <Button
          onClick={() => {
            fileInputRef.current?.click();
          }}
          size="sm"
          m={4}
        >
          Import Session
        </Button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </Flex>
      <TableContainer fontSize="md">
        <Table variant="simple">
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | {
                        isNumeric: boolean;
                      }
                    | undefined;
                  return (
                    <Th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      isNumeric={meta?.isNumeric}
                      verticalAlign="center"
                      userSelect="none"
                    >
                      <Flex align="center">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <chakra.span pl={4}>
                          {{
                            asc: (
                              <VscTriangleUp aria-label="sorted ascending" />
                            ),
                            desc: (
                              <VscTriangleDown aria-label="sorted descending" />
                            ),
                          }[header.column.getIsSorted() as string] ?? null}
                        </chakra.span>
                      </Flex>
                    </Th>
                  );
                })}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows.map((row) => (
              <Tr key={row.id} _hover={{ cursor: 'pointer' }}>
                {row.getVisibleCells().map((cell, index) => {
                  const meta = cell.column.columnDef.meta as
                    | {
                        isNumeric: boolean;
                      }
                    | undefined;
                  return (
                    <Td
                      key={cell.id}
                      isNumeric={meta?.isNumeric}
                      onClick={() => {
                        if (index !== 0)
                          navigate(`/session/${row.original.id}`);
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Td>
                  );
                })}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      <Flex mt={4}>
        <Flex gap={16} align="center" ml={4}>
          <Flex gap={1}>
            <IconButton
              aria-label={'Goto 1st Page'}
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <FiChevronsLeft />
            </IconButton>
            <IconButton
              aria-label={'Goto Previous Page'}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <FiChevronLeft />
            </IconButton>
          </Flex>
          <Flex gap={1} fontSize="md">
            <Text>Page</Text>
            <Text as="b" w={12}>
              {`${
                table.getState().pagination.pageIndex + 1
              } of ${table.getPageCount()}`}
            </Text>
          </Flex>
          <Divider orientation="vertical" />
          <Flex gap={1} justify="center" align="center" fontSize="md">
            <Text w={28}>Go to page:</Text>
            <Input
              w={20}
              size="md"
              type="number"
              defaultValue={table.getState().pagination.pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                table.setPageIndex(page);
              }}
            />
          </Flex>
          <Flex gap={1}>
            <IconButton
              aria-label={'Goto Next Page'}
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <FiChevronRight />
            </IconButton>
            <IconButton
              aria-label={'Goto last Page'}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <FiChevronsRight />
            </IconButton>
          </Flex>
        </Flex>
        <Spacer />
        <Flex gap={8} align="center" mr={4}>
          <Select
            variant="outline"
            size="md"
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize} items
              </option>
            ))}
          </Select>
          {selectedSessionIds.length > 0 && (
            <Flex gap={1}>
              <Button
                mr={4}
                size="md"
                colorScheme="red"
                isDisabled={isUploading}
                onClick={() => {
                  void deleteSessions(selectedSessionIds).then(() => {
                    setRowSelection({});
                    void updateSessions();
                    channel.emit(EventName.SessionUpdated, {});
                  });
                }}
              >
                Delete
              </Button>
              <Button
                mr={4}
                size="md"
                colorScheme="green"
                isDisabled={isUploading}
                onClick={() => {
                  void downloadSessions(selectedSessionIds);
                }}
              >
                Download
              </Button>
              <Button
                mr={4}
                size="md"
                colorScheme="blue"
                isLoading={isUploading}
                loadingText="Uploading"
                onClick={() => {
                  void handleUpload(selectedSessionIds);
                }}
              >
                Upload
              </Button>
            </Flex>
          )}
        </Flex>
      </Flex>
    </>
  );
}
