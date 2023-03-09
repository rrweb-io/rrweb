import { useEffect, useMemo, useState } from 'react';
import {
  chakra,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  TableContainer,
  Flex,
  Checkbox,
  Button,
  Spacer,
  IconButton,
  Select,
  Input,
  Divider,
} from '@chakra-ui/react';
import {
  createColumnHelper,
  useReactTable,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
  PaginationState,
} from '@tanstack/react-table';
import { VscTriangleDown, VscTriangleUp } from 'react-icons/vsc';
import { useNavigate } from 'react-router-dom';
import { Session, EventName } from '~/types';
import Channel from '~/utils/channel';
import { deleteSessions, getAllSessions } from '~/utils/storage';
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
} from 'react-icons/fi';

const columnHelper = createColumnHelper<Session>();
const channel = new Channel();

export function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const navigate = useNavigate();
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
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            isChecked={row.getIsSelected()}
            isIndeterminate={row.getIsSomeSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      }),
      columnHelper.accessor((row) => row.name, {
        cell: (info) => info.getValue(),
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
    [],
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

  return (
    <>
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
          {Object.keys(rowSelection).length > 0 && (
            <Button
              mr={4}
              size="md"
              colorScheme="red"
              onClick={() => {
                if (table.getSelectedRowModel().flatRows.length === 0) return;
                const ids = table
                  .getSelectedRowModel()
                  .flatRows.map((row) => row.original.id);
                void deleteSessions(ids).then(() => {
                  setRowSelection({});
                  void updateSessions();
                  channel.emit(EventName.SessionUpdated, {});
                });
              }}
            >
              Delete
            </Button>
          )}
        </Flex>
      </Flex>
    </>
  );
}
