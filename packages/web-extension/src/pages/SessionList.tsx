import { useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import {
  Box,
  Button,
  Checkbox,
  Editable,
  EditableInput,
  EditablePreview,
  Flex,
  Heading,
  IconButton,
  Input,
  Select,
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
  getSortedRowModel,
  type PaginationState,
} from '@tanstack/react-table';
import { VscTriangleDown, VscTriangleUp } from 'react-icons/vsc';
import { FiEdit3 as EditIcon } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import type { eventWithTime } from 'rrweb';
import { type Session, EventName, ServiceName } from '~/types';
import Channel from '~/utils/channel';
import {
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
import { ShareAction } from './ShareAction';

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
  const [rowSelection, setRowSelection] = useState({});

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

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            isChecked={table.getIsAllRowsSelected()}
            isIndeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            aria-label="Select all sessions"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            isChecked={row.getIsSelected()}
            isIndeterminate={row.getIsSomeSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={`Select ${row.original.name}`}
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
                    aria-label="Edit name"
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
              maxW="420px"
              minW={0}
            >
              <Editable
                minW={0}
                maxW="100%"
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
                <EditablePreview
                  cursor="pointer"
                  display="block"
                  noOfLines={1}
                  wordBreak="break-all"
                  title={info.getValue()}
                />
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
        header: 'Created',
        sortDescFirst: true,
      }),
      columnHelper.accessor((row) => row.recorderVersion, {
        cell: (info) => info.getValue(),
        header: 'rrweb version',
      }),
      columnHelper.display({
        id: 'share',
        header: () => null,
        // Clicks here, the dialog's included, must not open the player.
        cell: ({ row }) => (
          <Box onClick={(e) => e.stopPropagation()} cursor="default">
            <ShareAction sessionId={row.original.id} />
          </Box>
        ),
      }),
    ],
    [sessions],
  );
  const table = useReactTable<Session>({
    columns,
    data: fetchData(fetchDataOptions).rows,
    getRowId: (row) => row.id,
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

  // Selection survives page changes, so bulk actions resolve it against the
  // whole list, not the table's current page. Ids of deleted sessions drop out.
  const selectedIds = sessions
    .map((session) => session.id)
    .filter((id) => (rowSelection as Record<string, boolean>)[id]);
  const selectedCount = selectedIds.length;

  const deleteSelected = async () => {
    try {
      // The background also removes what Share kept for these sessions.
      await channel.request(ServiceName.DeleteSessions, {
        sessionIds: selectedIds,
      });
    } catch (error) {
      toast({
        title: 'Could not delete the sessions',
        description: error instanceof Error ? error.message : String(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setRowSelection({});
    void updateSessions();
    channel.emit(EventName.SessionUpdated, {});
  };

  return (
    <>
      <Flex
        justify="space-between"
        align="center"
        gap="16px"
        wrap="wrap"
        mb="24px"
      >
        <Heading as="h1" fontSize="24px" fontWeight={600}>
          Sessions
        </Heading>
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          Import session
        </Button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </Flex>
      <TableContainer
        bg="brand.surface"
        border="1px solid"
        borderColor="brand.rule"
        borderRadius="12px"
        fontSize="14px"
      >
        <Table variant="unstyled">
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr
                key={headerGroup.id}
                borderBottom="1px solid"
                borderColor="brand.rule"
              >
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | {
                        isNumeric: boolean;
                      }
                    | undefined;
                  const sortable = header.column.getCanSort();
                  return (
                    <Th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      isNumeric={meta?.isNumeric}
                      verticalAlign="center"
                      userSelect="none"
                      cursor={sortable ? 'pointer' : undefined}
                      h="44px"
                      px="16px"
                      py="0"
                      w={header.column.id === 'select' ? '48px' : undefined}
                      textTransform="none"
                      letterSpacing="normal"
                      fontSize="13px"
                      fontWeight={500}
                      color="brand.inkMuted"
                    >
                      <Flex align="center" gap="6px">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: <VscTriangleUp aria-label="sorted ascending" />,
                          desc: (
                            <VscTriangleDown aria-label="sorted descending" />
                          ),
                        }[header.column.getIsSorted() as string] ?? null}
                      </Flex>
                    </Th>
                  );
                })}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows.map((row) => (
              <Tr
                key={row.id}
                cursor="pointer"
                borderBottom="1px solid"
                borderColor="brand.rule"
                _last={{ borderBottom: 'none' }}
                bg={row.getIsSelected() ? 'whiteAlpha.100' : undefined}
                _hover={{ bg: 'whiteAlpha.50' }}
              >
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
                      px="16px"
                      py="10px"
                      color={index === 1 ? 'white' : 'brand.inkSoft'}
                      fontWeight={index === 1 ? 600 : 400}
                      sx={{ fontVariantNumeric: 'tabular-nums' }}
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
      <Flex mt="16px" gap="16px" align="center" wrap="wrap" fontSize="14px">
        <Flex gap="4px" align="center">
          <IconButton
            variant="quiet"
            size="sm"
            aria-label="First page"
            onClick={() => table.setPageIndex(0)}
            isDisabled={!table.getCanPreviousPage()}
            icon={<FiChevronsLeft />}
          />
          <IconButton
            variant="quiet"
            size="sm"
            aria-label="Previous page"
            onClick={() => table.previousPage()}
            isDisabled={!table.getCanPreviousPage()}
            icon={<FiChevronLeft />}
          />
          <Text px="8px" color="brand.inkSoft" whiteSpace="nowrap">
            Page{' '}
            <Text as="b" color="white">
              {`${table.getState().pagination.pageIndex + 1} of ${Math.max(
                table.getPageCount(),
                1,
              )}`}
            </Text>
          </Text>
          <IconButton
            variant="quiet"
            size="sm"
            aria-label="Next page"
            onClick={() => table.nextPage()}
            isDisabled={!table.getCanNextPage()}
            icon={<FiChevronRight />}
          />
          <IconButton
            variant="quiet"
            size="sm"
            aria-label="Last page"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            isDisabled={!table.getCanNextPage()}
            icon={<FiChevronsRight />}
          />
        </Flex>
        <Flex gap="8px" align="center" color="brand.inkSoft">
          <Text as="label" htmlFor="go-to-page" whiteSpace="nowrap">
            Go to page
          </Text>
          <Input
            id="go-to-page"
            w="64px"
            size="sm"
            type="number"
            borderColor="brand.input"
            borderRadius="8px"
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              table.setPageIndex(page);
            }}
          />
        </Flex>
        <Select
          aria-label="Sessions per page"
          size="sm"
          w="auto"
          borderColor="brand.input"
          borderRadius="8px"
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </Select>
        {selectedCount > 0 && (
          <Flex gap="8px" align="center" ml="auto">
            <Text color="brand.inkSoft" whiteSpace="nowrap">
              {selectedCount} selected
            </Text>
            <Button
              variant="quiet"
              size="sm"
              onClick={() => void downloadSessions(selectedIds)}
            >
              Download
            </Button>
            <Button
              variant="quiet"
              size="sm"
              onClick={() => void deleteSelected()}
            >
              Delete
            </Button>
          </Flex>
        )}
      </Flex>
    </>
  );
}
